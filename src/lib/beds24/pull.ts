import type { BookingSource, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, eachNight, nightsBetween, parseDay, todayInImlil, toISO } from "@/lib/booking/dates";
import { b24 } from "./client";
import { BEDS24_ROOMS, CLOSURE_PREFIX, OTA_REF_PREFIX, SITE_REF_PREFIX, slugByBeds24Room } from "./rooms";

/** How far ahead the site mirrors Beds24 (Booking.com and Airbnb sell about a year ahead). */
const HORIZON_DAYS = 420;

type B24Booking = {
  id: number;
  roomId: number;
  status: string;
  arrival: string;
  departure: string;
  numAdult?: number;
  numChild?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  country?: string;
  country2?: string | null;
  channel?: string;
  apiSource?: string;
  apiReference?: string;
  reference?: string;
  price?: number;
  comments?: string;
  bookingTime?: string;
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

/** Beds24 channel → site booking source. Expedia (no source of its own in the database) and anything else count as an agency; the note says which. */
function sourceOf(b: B24Booking): BookingSource {
  if (b.channel === "booking") return "BOOKING_COM";
  if (b.channel === "airbnb" || b.channel === "airbnbical") return "AIRBNB";
  return "AGENCY";
}

export type PullResult =
  | { ok: true; bookings: number; created: number; updated: number; cancelled: number; closures: number; added: number; changed: number; removed: number }
  | { ok: false; error: string };

/**
 * Mirror Beds24 into the site:
 *  - Booking.com / Airbnb reservations become real site bookings (source BOOKING_COM / AIRBNB, reference "B24-<id>"),
 *    so they show in the calendar, the bookings list and the dashboard. Their cancellations are mirrored too.
 *  - Nights closed in Beds24 become room blocks ("b24:cl:…").
 * Bookings the site pushed itself (reference RBT-…) are skipped. Nothing is cancelled or deleted unless the reads succeeded.
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
    const bookedDays = new Map<string, Set<string>>(); // siteRoomId → ISO nights covered by a booking
    const markBooked = (roomId: string, start: Date, end: Date) => {
      const set = bookedDays.get(roomId) ?? new Set<string>();
      for (const n of eachNight(start, end)) set.add(toISO(n));
      bookedDays.set(roomId, set);
    };

    // ── channel reservations → site bookings ──
    const seen = new Set<string>();
    let created = 0;
    let updated = 0;
    let otaCount = 0;
    for (const b of bookings) {
      if (b.status === "inquiry" || b.status === "cancelled") continue;
      if (b.reference?.startsWith(SITE_REF_PREFIX)) continue;
      const roomId = siteRoom(b.roomId);
      const start = parseDay(b.arrival);
      const end = parseDay(b.departure);
      if (!roomId || !start || !end || end <= start || end <= today) continue;
      markBooked(roomId, start, end);

      // a "black" booking is a closure made in Beds24, not a guest
      if (b.status === "black") {
        const uid = `${CLOSURE_PREFIX}bk:${b.id}`;
        wanted.set(uid, { uid, roomId, start, end, reason: "Fermé (Beds24)" });
        continue;
      }
      otaCount++;
      const r = await upsertOtaBooking(b, roomId, start, end);
      seen.add(`${OTA_REF_PREFIX}${b.id}`);
      if (r === "created") created++;
      else if (r === "updated") updated++;
    }

    // a mirrored reservation that disappeared from the upcoming list was cancelled (or moved off our rooms)
    let cancelled = 0;
    const open = await db.booking.findMany({
      where: { reference: { startsWith: OTA_REF_PREFIX }, status: { not: "CANCELLED" }, checkOut: { gt: today } },
      select: { id: true, reference: true },
    });
    for (const o of open) {
      if (seen.has(o.reference)) continue;
      const id = Number(o.reference.slice(OTA_REF_PREFIX.length));
      const res = await b24<{ data?: B24Booking[] }>("GET", `/bookings?id=${id}`);
      const now = res.data?.[0];
      // still alive but outside the window we read (e.g. moved to another property): leave it
      if (now && now.status !== "cancelled" && now.status !== "inquiry" && slugByBeds24Room(now.roomId)) continue;
      await db.booking.update({ where: { id: o.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      cancelled++;
    }

    // ── nights closed in Beds24 that no booking explains ──
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
    // site bookings occupy nights too: a blackout under one of them is not a separate closure
    const siteBookings = await db.booking.findMany({
      where: { status: { notIn: ["CANCELLED", "NO_SHOW"] }, checkOut: { gt: today } },
      select: { roomId: true, checkIn: true, checkOut: true },
    });
    for (const s of siteBookings) markBooked(s.roomId, s.checkIn, s.checkOut);

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

    // write only the difference (old "b24:bk:" guest blocks from the first version disappear here)
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

    // the old iCal feeds are gone (Beds24 replaced them): their imported stays would never refresh again and could keep
    // nights closed after a cancellation. Remove them once Beds24 has been read successfully (blocks go with the feed).
    await db.icalFeed.deleteMany({});

    const result = {
      ok: true as const,
      bookings: otaCount,
      created,
      updated,
      cancelled,
      closures: closureCount,
      added: fresh.length,
      changed: changed.length,
      removed: gone.length,
    };
    await saveState({ ok: true, at: new Date().toISOString(), bookings: otaCount, closures: closureCount });
    return result;
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 300) : "Erreur inconnue";
    await saveState({ ok: false, error, at: new Date().toISOString() }).catch(() => {});
    return { ok: false, error };
  }
}

/** Create or refresh the site copy of one Booking.com / Airbnb reservation. */
async function upsertOtaBooking(b: B24Booking, roomId: string, checkIn: Date, checkOut: Date): Promise<"created" | "updated" | "same"> {
  const reference = `${OTA_REF_PREFIX}${b.id}`;
  const source = sourceOf(b);
  // Airbnb prices and bookings are in euros (the listing and the Beds24 mapping were switched from MAD to EUR)
  const currency = "EUR";
  const total = Math.max(0, Number(b.price) || 0);
  const adults = Math.max(1, Math.min(10, Number(b.numAdult) || 2));
  const children = Math.max(0, Math.min(10, Number(b.numChild) || 0));
  const nights = nightsBetween(checkIn, checkOut);
  const guest = {
    firstName: (b.firstName || "").slice(0, 80) || "Client",
    lastName: (b.lastName || "").slice(0, 80) || (source === "AIRBNB" ? "Airbnb" : source === "BOOKING_COM" ? "Booking.com" : "Beds24"),
    email: (b.email || "").slice(0, 160),
    phone: (b.mobile || b.phone || "").slice(0, 30),
    country: (b.country2 || b.country || "").slice(0, 60),
  };
  const notes = [`${source === "AIRBNB" ? "Airbnb" : source === "BOOKING_COM" ? "Booking.com" : b.channel === "expedia" ? "Expedia" : (b.apiSource ?? "Beds24")} n° ${b.apiReference || b.id}`, b.comments?.trim()].filter(Boolean).join("\n").slice(0, 4000);

  const existing = await db.booking.findUnique({
    where: { reference },
    select: { id: true, guestId: true, roomId: true, checkIn: true, checkOut: true, status: true, total: true, adults: true, children: true, internalNotes: true },
  });

  if (!existing) {
    const g = await db.guest.create({ data: guest, select: { id: true } });
    await db.booking.create({
      data: {
        reference,
        roomId,
        guestId: g.id,
        checkIn,
        checkOut,
        nights,
        adults,
        children,
        status: "CONFIRMED",
        source,
        roomTotal: total,
        total,
        currency,
        nightlyRates: [],
        depositAmount: 0,
        // Airbnb charges the guest; Booking.com guests usually pay at the riad
        paymentStatus: source === "AIRBNB" ? "PAID" : "UNPAID",
        paymentMethod: source === "AIRBNB" ? "Airbnb" : source === "BOOKING_COM" ? "Booking.com" : null,
        internalNotes: notes,
        createdAt: b.bookingTime ? new Date(b.bookingTime) : undefined,
      },
    });
    return "created";
  }

  const same =
    existing.roomId === roomId &&
    existing.checkIn.getTime() === checkIn.getTime() &&
    existing.checkOut.getTime() === checkOut.getTime() &&
    existing.status !== "CANCELLED" &&
    Number(existing.total) === total &&
    existing.adults === adults &&
    existing.children === children;
  if (same) return "same";
  await db.$transaction([
    db.booking.update({
      where: { id: existing.id },
      data: { roomId, checkIn, checkOut, nights, adults, children, roomTotal: total, total, ...(existing.status === "CANCELLED" ? { status: "CONFIRMED", cancelledAt: null } : {}) },
    }),
    db.guest.update({ where: { id: existing.guestId }, data: guest }),
  ]);
  return "updated";
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
