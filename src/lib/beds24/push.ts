import { db } from "@/lib/db";
import { addDays, eachNight, parseDay, todayInImlil, toISO } from "@/lib/booking/dates";
import { b24, beds24Configured } from "./client";
import { BEDS24_ROOMS, SITE_REF_PREFIX, beds24RoomId } from "./rooms";

/** Site statuses that occupy the room (the availability engine counts every non-cancelled booking). */
const OCCUPYING = ["PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];

type B24Booking = { id: number; roomId: number; status: string; arrival: string; departure: string; reference?: string };
type PostResult = { success?: boolean; new?: { id?: number }; errors?: unknown; warnings?: unknown }[];

const fail = (what: string, r: PostResult) => {
  const first = r?.[0];
  if (!first?.success) throw new Error(`Beds24 ${what}: ${JSON.stringify(first?.errors ?? first ?? r).slice(0, 300)}`);
};

/**
 * Beds24 stores our reference in the booking's "reference" field but has no search on it (apiReference is read-only
 * and only set for channel bookings). A site booking never changes its dates, so a narrow arrival window finds it.
 */
async function findByReference(ref: string, arrival: Date): Promise<B24Booking | null> {
  const res = await b24<{ data?: B24Booking[] }>("GET", `/bookings?arrivalFrom=${toISO(addDays(arrival, -1))}&arrivalTo=${toISO(addDays(arrival, 1))}`);
  return res.data?.find((b) => b.reference === ref) ?? null;
}

/**
 * Make Beds24 match one site booking: create it (so Booking.com and Airbnb close the nights at once),
 * move/cancel it when the site changed it. Idempotent: the site reference is the key.
 */
export async function pushBooking(id: string): Promise<void> {
  if (!beds24Configured()) return;
  const b = await db.booking.findUnique({
    where: { id },
    select: {
      reference: true, status: true, checkIn: true, checkOut: true, adults: true, specialRequests: true, total: true, currency: true,
      room: { select: { slug: true } },
      guest: { select: { firstName: true, lastName: true, email: true, phone: true, country: true } },
    },
  });
  if (!b) return;
  const roomId = beds24RoomId(b.room.slug);
  if (!roomId) return;
  const status = OCCUPYING.includes(b.status) ? "confirmed" : "cancelled";
  const arrival = toISO(b.checkIn);
  const departure = toISO(b.checkOut);

  const existing = await findByReference(b.reference, b.checkIn);
  if (!existing) {
    if (status === "cancelled") return;
    const r = await b24<PostResult>("POST", "/bookings", [
      {
        roomId,
        status,
        arrival,
        departure,
        numAdult: b.adults,
        numChild: 0,
        firstName: b.guest.firstName.slice(0, 100),
        lastName: b.guest.lastName.slice(0, 100),
        ...(b.guest.email ? { email: b.guest.email.slice(0, 100) } : {}),
        ...(b.guest.phone ? { mobile: b.guest.phone.slice(0, 100) } : {}),
        ...(b.guest.country ? { country: b.guest.country.slice(0, 100) } : {}),
        // "reference" is the only key Beds24 stores and returns; pulls and lookups match on it
        reference: b.reference,
        notes: `Site web · ${Number(b.total)} ${b.currency}${b.specialRequests ? `\n${b.specialRequests.slice(0, 500)}` : ""}`,
      },
    ]);
    fail("création de la réservation", r);
    return;
  }
  if (existing.status === status && existing.arrival === arrival && existing.departure === departure && existing.roomId === roomId) return;
  const r = await b24<PostResult>("POST", "/bookings", [{ id: existing.id, roomId, status, arrival, departure }]);
  fail("mise à jour de la réservation", r);
}

/** Never throws: a Beds24 outage must not break the site. The daily reconcile retries what failed. */
export async function pushBookingSafe(id: string) {
  try {
    await pushBooking(id);
  } catch (e) {
    console.error("[beds24] pushBooking", id, e instanceof Error ? e.message : e);
  }
}

/** Cancel in Beds24 the bookings that are about to be deleted from the site. */
export async function cancelInBeds24(bookings: { reference: string; checkIn: Date }[]) {
  if (!beds24Configured()) return;
  for (const { reference: ref, checkIn } of bookings) {
    try {
      const ex = await findByReference(ref, checkIn);
      if (ex && ex.status !== "cancelled") fail("annulation", await b24<PostResult>("POST", "/bookings", [{ id: ex.id, status: "cancelled" }]));
    } catch (e) {
      console.error("[beds24] cancel", ref, e instanceof Error ? e.message : e);
    }
  }
}

/** Close (true) or reopen (false) a range of nights for every channel at once. `end` is exclusive, like site blocks. */
export async function setClosure(roomSlug: string, start: Date, end: Date, closed: boolean) {
  if (!beds24Configured()) return;
  const roomId = beds24RoomId(roomSlug);
  if (!roomId) return;
  const r = await b24<PostResult>("POST", "/inventory/rooms/calendar", [
    { roomId, calendar: [{ from: toISO(start), to: toISO(addDays(end, -1)), override: closed ? "blackout" : "none" }] },
  ]);
  fail(closed ? "fermeture" : "réouverture", r);
}

export async function setClosureSafe(roomSlug: string, start: Date, end: Date, closed: boolean) {
  try {
    await setClosure(roomSlug, start, end, closed);
  } catch (e) {
    console.error("[beds24] closure", roomSlug, e instanceof Error ? e.message : e);
  }
}

export type ReconcileResult = { ok: true; created: number; updated: number; closed: number } | { ok: false; error: string };

/**
 * Safety net (daily cron + admin button): push every upcoming site booking Beds24 lacks or has wrong,
 * and close in Beds24 the nights of manual site blocks. It only adds or corrects; it never reopens a night.
 */
export async function reconcileToBeds24(): Promise<ReconcileResult> {
  if (!beds24Configured()) return { ok: false, error: "Beds24 non configuré" };
  try {
    const today = todayInImlil();
    const roomIdParams = Object.values(BEDS24_ROOMS).map((id) => `roomId=${id}`).join("&");

    const theirs = new Map<string, B24Booking>();
    for (let page = 1; page <= 20; page++) {
      const res = await b24<{ data?: B24Booking[]; pages?: { nextPageExists?: boolean } }>("GET", `/bookings?departureFrom=${toISO(today)}&${roomIdParams}&page=${page}`);
      for (const x of res.data ?? []) if (x.reference?.startsWith(SITE_REF_PREFIX)) theirs.set(x.reference, x);
      if (!res.pages?.nextPageExists) break;
    }

    const mine = await db.booking.findMany({ where: { checkOut: { gt: today } }, select: { id: true, reference: true, status: true, checkIn: true, checkOut: true, room: { select: { slug: true } } } });
    let created = 0;
    let updated = 0;
    for (const b of mine) {
      const roomId = beds24RoomId(b.room.slug);
      if (!roomId) continue;
      const want = OCCUPYING.includes(b.status) ? "confirmed" : "cancelled";
      const ex = theirs.get(b.reference);
      const same = ex && ex.status === want && ex.arrival === toISO(b.checkIn) && ex.departure === toISO(b.checkOut) && ex.roomId === roomId;
      if (same || (!ex && want === "cancelled")) continue;
      await pushBooking(b.id);
      if (ex) updated++;
      else created++;
    }

    // manual / maintenance blocks → blackout in Beds24 (add only)
    const blocks = await db.roomBlock.findMany({
      where: { source: { in: ["MANUAL", "MAINTENANCE"] }, endDate: { gt: today } },
      select: { startDate: true, endDate: true, room: { select: { slug: true } } },
    });
    const byRoom = new Map<string, Set<string>>();
    for (const bl of blocks) {
      const set = byRoom.get(bl.room.slug) ?? new Set<string>();
      for (const n of eachNight(bl.startDate < today ? today : bl.startDate, bl.endDate)) set.add(toISO(n));
      byRoom.set(bl.room.slug, set);
    }
    let closed = 0;
    for (const [slug, days] of byRoom) {
      const roomId = beds24RoomId(slug);
      if (!roomId || !days.size) continue;
      const sorted = [...days].sort();
      const cal = await b24<{ data?: { calendar?: { from: string; to: string; override?: string }[] }[] }>(
        "GET",
        `/inventory/rooms/calendar?roomId=${roomId}&startDate=${sorted[0]}&endDate=${sorted[sorted.length - 1]}&includeOverride=true`,
      );
      const already = new Set<string>();
      for (const seg of cal.data?.[0]?.calendar ?? []) {
        if (seg.override !== "blackout") continue;
        for (const n of eachNight(parseDay(seg.from)!, addDays(parseDay(seg.to)!, 1))) already.add(toISO(n));
      }
      const missing = sorted.filter((d) => !already.has(d));
      if (!missing.length) continue;
      const runs: { from: string; to: string }[] = [];
      for (const d of missing) {
        const last = runs[runs.length - 1];
        if (last && toISO(addDays(parseDay(last.to)!, 1)) === d) last.to = d;
        else runs.push({ from: d, to: d });
      }
      fail("fermetures", await b24<PostResult>("POST", "/inventory/rooms/calendar", [{ roomId, calendar: runs.map((r) => ({ ...r, override: "blackout" })) }]));
      closed += missing.length;
    }
    return { ok: true, created, updated, closed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Erreur inconnue" };
  }
}
