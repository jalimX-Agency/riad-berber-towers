import { addDays, parseDay, toISO } from "@/lib/booking/dates";
import { b24 } from "./client";
import { BEDS24_ROOMS, CHANNELS, beds24RoomId, type ChannelDef } from "./rooms";

type Segment = {
  from: string;
  to: string;
  numAvail?: number;
  minStay?: number;
  override?: string;
  price1?: number;
  price2?: number;
  channels?: Record<string, { maxBookings?: number | null }>;
};
type CalendarRow = { roomId: number; calendar?: Segment[] };

export type DayCell = {
  date: string;
  /** nightly price per channel, in that channel's currency (null = none set) */
  prices: Record<ChannelDef["key"], number | null>;
  /** rooms left in Beds24 (0 = booked or closed for everyone) */
  avail: number;
  /** closed by hand for every channel */
  blackout: boolean;
  minStay: number | null;
  /** channels shut for this night only */
  channelOff: Record<ChannelDef["key"], boolean>;
};

const INCLUDE = "includePrices=true&includeNumAvail=true&includeMinStay=true&includeOverride=true&includeChannels=true";

/** One room, one range, expanded to one cell per night. */
export async function readCalendar(slug: string, from: Date, toInclusive: Date): Promise<DayCell[]> {
  const roomId = beds24RoomId(slug);
  if (!roomId) return [];
  const res = await b24<{ data?: CalendarRow[] }>("GET", `/inventory/rooms/calendar?roomId=${roomId}&startDate=${toISO(from)}&endDate=${toISO(toInclusive)}&${INCLUDE}`);
  const segments = res.data?.[0]?.calendar ?? [];
  const cells = new Map<string, DayCell>();
  for (const seg of segments) {
    const s = parseDay(seg.from);
    const e = parseDay(seg.to);
    if (!s || !e) continue;
    for (let d = s; d <= e; d = addDays(d, 1)) {
      cells.set(toISO(d), {
        date: toISO(d),
        prices: { booking: seg.price1 ?? null, airbnb: seg.price2 ?? null },
        avail: seg.numAvail ?? 0,
        blackout: seg.override === "blackout",
        minStay: seg.minStay ?? null,
        // a night without a price for a channel is not offered on that channel
        channelOff: { booking: seg.price1 == null, airbnb: seg.price2 == null },
      });
    }
  }
  const out: DayCell[] = [];
  for (let d = from; d <= toInclusive; d = addDays(d, 1)) {
    out.push(cells.get(toISO(d)) ?? { date: toISO(d), prices: { booking: null, airbnb: null }, avail: 0, blackout: false, minStay: null, channelOff: { booking: false, airbnb: false } });
  }
  return out;
}

/** Several rooms in one call (the control calendar shows them all). Keyed by room slug. */
export async function readCalendarMany(slugs: string[], from: Date, toInclusive: Date): Promise<Map<string, DayCell[]>> {
  const ids = slugs.map((s) => beds24RoomId(s)).filter((x): x is number => x !== null);
  const out = new Map<string, DayCell[]>();
  if (!ids.length) return out;
  const rows: CalendarRow[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await b24<{ data?: CalendarRow[]; pages?: { nextPageExists?: boolean } }>(
      "GET",
      `/inventory/rooms/calendar?${ids.map((i) => `roomId=${i}`).join("&")}&startDate=${toISO(from)}&endDate=${toISO(toInclusive)}&${INCLUDE}&page=${page}`,
    );
    rows.push(...(res.data ?? []));
    if (!res.pages?.nextPageExists) break;
  }
  for (const slug of slugs) {
    const id = beds24RoomId(slug);
    const segments = rows.filter((r) => r.roomId === id).flatMap((r) => r.calendar ?? []);
    out.set(slug, expand(segments, from, toInclusive));
  }
  return out;
}

function expand(segments: Segment[], from: Date, toInclusive: Date): DayCell[] {
  const cells = new Map<string, DayCell>();
  for (const seg of segments) {
    const s = parseDay(seg.from);
    const e = parseDay(seg.to);
    if (!s || !e) continue;
    for (let d = s; d <= e; d = addDays(d, 1)) {
      cells.set(toISO(d), {
        date: toISO(d),
        prices: { booking: seg.price1 ?? null, airbnb: seg.price2 ?? null },
        avail: seg.numAvail ?? 0,
        blackout: seg.override === "blackout",
        minStay: seg.minStay ?? null,
        channelOff: { booking: seg.price1 == null, airbnb: seg.price2 == null },
      });
    }
  }
  const out: DayCell[] = [];
  for (let d = from; d <= toInclusive; d = addDays(d, 1)) {
    out.push(cells.get(toISO(d)) ?? { date: toISO(d), prices: { booking: null, airbnb: null }, avail: 0, blackout: false, minStay: null, channelOff: { booking: true, airbnb: true } });
  }
  return out;
}

export type ChannelState = "keep" | "open" | "close";

export type BulkChange = {
  /** room slugs; empty = every room */
  rooms: string[];
  from: Date;
  /** last night, inclusive */
  to: Date;
  /** 0 (Sunday) … 6; empty = every day */
  weekdays: number[];
  prices: Partial<Record<ChannelDef["key"], number>>;
  minStay?: number;
  channelState: Partial<Record<ChannelDef["key"], ChannelState>>;
};

/** Apply one change to Beds24: it forwards prices and closures to Booking.com and Airbnb at once. Returns the nights touched. */
export async function applyBulk(change: BulkChange): Promise<{ nights: number; rooms: number }> {
  const slugs = change.rooms.length ? change.rooms : Object.keys(BEDS24_ROOMS);
  const days: string[] = [];
  for (let d = change.from; d <= change.to; d = addDays(d, 1)) {
    if (!change.weekdays.length || change.weekdays.includes(d.getUTCDay())) days.push(toISO(d));
  }
  if (!days.length) return { nights: 0, rooms: 0 };

  // consecutive nights share one calendar item
  const runs: { from: string; to: string }[] = [];
  for (const d of days) {
    const last = runs[runs.length - 1];
    if (last && toISO(addDays(parseDay(last.to)!, 1)) === d) last.to = d;
    else runs.push({ from: d, to: d });
  }

  // Beds24 only offers a night on a channel when that channel has a price for it (tested on the live account:
  // removing the price closes the night on that channel alone; the API's per-channel booking limit is not stored).
  // So "close on one platform" removes its price, and "reopen" needs a price to put back.
  const fields: Record<string, unknown> = {};
  for (const ch of CHANNELS) {
    const price = change.prices[ch.key];
    const state = change.channelState[ch.key] ?? "keep";
    if (state === "close") fields[ch.priceField] = null;
    else if (price !== undefined) fields[ch.priceField] = price;
    else if (state === "open") throw new Error(`Pour rouvrir ${ch.label}, indiquez aussi son prix par nuit.`);
  }
  if (change.minStay !== undefined) fields.minStay = change.minStay;
  if (!Object.keys(fields).length) return { nights: 0, rooms: 0 };

  const body = slugs
    .map((slug) => ({ roomId: beds24RoomId(slug), calendar: runs.map((r) => ({ ...r, ...fields })) }))
    .filter((x): x is { roomId: number; calendar: typeof x.calendar } => x.roomId !== null);

  // stay well under the 1 MB payload limit: a few rooms per request
  for (let i = 0; i < body.length; i += 3) {
    const res = await b24<{ success?: boolean; errors?: unknown }[]>("POST", "/inventory/rooms/calendar", body.slice(i, i + 3));
    const bad = res.find((r) => !r.success);
    if (bad) throw new Error(`Beds24: ${JSON.stringify(bad.errors ?? bad).slice(0, 300)}`);
  }
  return { nights: days.length, rooms: body.length };
}
