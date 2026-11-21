import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, eachNight, parseDay, todayInImlil, toISO } from "@/lib/booking/dates";
import { b24 } from "./client";
import { BEDS24_ROOMS, CHANNELS, CLOSURE_PREFIX, SITE_REF_PREFIX, slugByBeds24Room } from "./rooms";

/** How far ahead the site mirrors Beds24 (Booking.com and Airbnb sell about a year ahead). */
const HORIZON_DAYS = 420;

type B24Booking = {
  id: number;
  roomId: number;
  status: string;
  arrival: string;
  departure: string;
  firstName?: string;
  lastName?: string;
  channel?: string;
  reference?: string;
};
type Paged<T> = { data?: T[]; pages?: { nextPageExists?: boolean } };
type CalendarRow = { roomId: number; calendar?: { from: string; to: string; override?: string; numAvail?: number }[] };

async function allPages<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await b24<Paged<T>>("GET", `${path}${path.includes("?") ? "&" : "?"}page=${page}`);
    out.push(...(res.data ?? []));
    if (!res.pages?.nextPageExists) break;
  }
  return out;
}

type Wanted = { uid: string; roomId: string; start: Date; end: Date; reason: string };

/** consecutive ISO days → [first, lastExclusive] ranges */
function ranges(days: string[]): { start: Date; end: Date }[] {
  const sorted = [...new Set(days)].sort();
  const out: { start: Date; end: Date }[] = [];
  for (const iso of sorted) {
    const d = parseDay(iso)!;
    const last = out[out.length - 1];
    if (last && last.end.getTime() === d.getTime()) last.end = addDays(d, 1);
    else out.push({ start: d, end: addDays(d, 1) });
  }
  return out;
}

export type PullResult = { ok: true; bookings: number; closures: number; added: number; changed: number; removed: number } | { ok: false; error: string };

/**
 * Mirror what Beds24 knows into the site's availability: bookings that came from Booking.com / Airbnb and nights
 * closed in Beds24 become room blocks (externalUid "b24:…"). Bookings the site pushed itself are skipped (they are
 * already site bookings). Nothing is deleted unless both Beds24 reads succeeded.
 */
export async function pullFromBeds24(): Promise<PullResult> {
  try {
    const today = todayInImlil();
    const horizon = addDays(today, HORIZON_DAYS);

    const roomRows = await db.room.findMany({ select: { id: true, slug: true } });
    const roomBySlug = new Map(roomRows.map((r) => [r.slug, r.id]));
    const siteRoom = (b24Room: number) => {
      const slug = slugByBeds24Room(b24Room);
      return slug ? (roomBySlug.get(slug) ?? null) : null;
    };

    const roomIdParams = Object.values(BEDS24_ROOMS).map((id) => `roomId=${id}`).join("&");
    const [bookings, calendars] = await Promise.all([
      allPages<B24Booking>(`/bookings?departureFrom=${toISO(today)}&${roomIdParams}`),
      allPages<CalendarRow>(`/inventory/rooms/calendar?startDate=${toISO(today)}&endDate=${toISO(horizon)}&includeOverride=true&includeNumAvail=true&${roomIdParams}`),
    ]);

    const wanted = new Map<string, Wanted>();
    const bookedDays = new Map<string, Set<string>>(); // siteRoomId → ISO nights already covered by a booking block
    const channelName = (c?: string) => CHANNELS.find((x) => x.bookingChannel === c)?.label ?? (c ? c : "Beds24");

    let bookingCount = 0;
    for (const b of bookings) {
      if (b.status === "cancelled" || b.status === "inquiry") continue;
      if (b.reference?.startsWith(SITE_REF_PREFIX)) continue;
      const roomId = siteRoom(b.roomId);
      const start = parseDay(b.arrival);
      const end = parseDay(b.departure);
      if (!roomId || !start || !end || end <= start || end <= today) continue;
      bookingCount++;
      const who = [b.lastName, b.firstName].filter(Boolean)[0] ?? "";
      wanted.set(`${CLOSURE_PREFIX}bk:${b.id}`, {
        uid: `${CLOSURE_PREFIX}bk:${b.id}`,
        roomId,
        start,
        end,
        reason: `${b.status === "black" ? "Fermé (Beds24)" : channelName(b.channel)}${who ? ` · ${who}` : ""}`.slice(0, 120),
      });
      const set = bookedDays.get(roomId) ?? new Set<string>();
      for (const n of eachNight(start, end)) set.add(toISO(n));
      bookedDays.set(roomId, set);
    }

    // nights the owner closed in Beds24 (or on a channel) and that no booking explains
    const manual = await db.roomBlock.findMany({
      where: { source: { in: ["MANUAL", "MAINTENANCE"] }, endDate: { gt: today } },
      select: { roomId: true, startDate: true, endDate: true },
    });
    const manualDays = new Map<string, Set<string>>();
    for (const m of manual) {
      const set = manualDays.get(m.roomId) ?? new Set<string>();
      for (const n of eachNight(m.startDate, m.endDate)) set.add(toISO(n));
      manualDays.set(m.roomId, set);
    }

    let closureCount = 0;
    for (const row of calendars) {
      const roomId = siteRoom(row.roomId);
      if (!roomId) continue;
      const days: string[] = [];
      for (const seg of row.calendar ?? []) {
        if (seg.override !== "blackout") continue;
        const from = parseDay(seg.from);
        const to = parseDay(seg.to);
        if (!from || !to) continue;
        for (const n of eachNight(from, addDays(to, 1))) {
          const iso = toISO(n);
          if (n >= today && !bookedDays.get(roomId)?.has(iso) && !manualDays.get(roomId)?.has(iso)) days.push(iso);
        }
      }
      for (const r of ranges(days)) {
        closureCount += 1;
        const uid = `${CLOSURE_PREFIX}cl:${row.roomId}:${toISO(r.start)}`;
        wanted.set(uid, { uid, roomId, start: r.start, end: r.end, reason: "Fermé dans Beds24" });
      }
    }

    // write only the difference
    const existing = await db.roomBlock.findMany({
      where: { externalUid: { startsWith: CLOSURE_PREFIX } },
      select: { id: true, externalUid: true, roomId: true, startDate: true, endDate: true, reason: true },
    });
    const byUid = new Map(existing.map((e) => [e.externalUid!, e]));
    const gone = existing.filter((e) => !wanted.has(e.externalUid!)).map((e) => e.id);
    const fresh = [...wanted.values()].filter((w) => !byUid.has(w.uid));
    const changed = [...wanted.values()].filter((w) => {
      const e = byUid.get(w.uid);
      return e && (e.roomId !== w.roomId || e.startDate.getTime() !== w.start.getTime() || e.endDate.getTime() !== w.end.getTime() || e.reason !== w.reason);
    });

    if (gone.length || fresh.length || changed.length) {
      await db.$transaction([
        ...(gone.length ? [db.roomBlock.deleteMany({ where: { id: { in: gone } } })] : []),
        ...(fresh.length
          ? [db.roomBlock.createMany({ data: fresh.map((w) => ({ roomId: w.roomId, externalUid: w.uid, startDate: w.start, endDate: w.end, source: "ICAL" as const, reason: w.reason })) })]
          : []),
        ...changed.map((w) => db.roomBlock.update({ where: { id: byUid.get(w.uid)!.id }, data: { roomId: w.roomId, startDate: w.start, endDate: w.end, reason: w.reason } })),
      ]);
    }

    const result = { ok: true as const, bookings: bookingCount, closures: closureCount, added: fresh.length, changed: changed.length, removed: gone.length };
    await saveState({ ...result, at: new Date().toISOString() });
    return result;
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 300) : "Erreur inconnue";
    await saveState({ ok: false, error, at: new Date().toISOString() }).catch(() => {});
    return { ok: false, error };
  }
}

export type SyncState = { ok: boolean; at: string; error?: string; bookings?: number; closures?: number };

async function saveState(state: SyncState) {
  const value = state as unknown as Prisma.InputJsonValue;
  await db.setting.upsert({ where: { key: "beds24Sync" }, update: { value }, create: { key: "beds24Sync", value } });
}

export async function readSyncState(): Promise<SyncState | null> {
  const row = await db.setting.findUnique({ where: { key: "beds24Sync" } });
  return (row?.value as SyncState | undefined) ?? null;
}
