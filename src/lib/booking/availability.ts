import { db } from "@/lib/db";
import { eachNight, nightsBetween, parseDay, todayInImlil, toISO } from "./dates";

export const MAX_NIGHTS = 30;
export const MAX_ADULTS = 6;

export type StayQuery = { checkIn: Date; checkOut: Date; adults: number; children: number; nights: number };

export type QueryError = "missing" | "invalid" | "past" | "order" | "too_long";

/** Validate raw search params. Returns the query, or an error code the UI translates. */
export function parseStayQuery(raw: {
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: string | null;
  children?: string | null;
}): { query: StayQuery | null; error: QueryError | null } {
  if (!raw.checkIn || !raw.checkOut) return { query: null, error: "missing" };
  const checkIn = parseDay(raw.checkIn);
  const checkOut = parseDay(raw.checkOut);
  if (!checkIn || !checkOut) return { query: null, error: "invalid" };
  if (checkIn < todayInImlil()) return { query: null, error: "past" };
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return { query: null, error: "order" };
  if (nights > MAX_NIGHTS) return { query: null, error: "too_long" };
  const adults = Math.min(MAX_ADULTS, Math.max(1, Number.parseInt(raw.adults ?? "2", 10) || 2));
  const children = Math.min(6, Math.max(0, Number.parseInt(raw.children ?? "0", 10) || 0));
  return { query: { checkIn, checkOut, adults, children, nights }, error: null };
}

export type RoomAvailability = {
  roomId: string;
  available: boolean;
  /** why a room can't be sold for this stay */
  reason: "booked" | "blocked" | "capacity" | "min_nights" | null;
  minNights: number;
  nightly: { date: string; price: number }[];
  total: number;
  /** average nightly price for the stay */
  perNight: number;
};

/**
 * Availability and price for every active room for one stay.
 * A night is sold when a non-cancelled booking or a block (manual or iCal) covers it.
 * Price per night: room-specific rate override > house-wide override > base price.
 */
export async function getAvailability(q: StayQuery): Promise<Map<string, RoomAvailability>> {
  const nights = eachNight(q.checkIn, q.checkOut);
  const overlap = { checkIn: { lt: q.checkOut }, checkOut: { gt: q.checkIn } };

  const [rooms, bookings, blocks, rates] = await Promise.all([
    db.room.findMany({ where: { active: true }, select: { id: true, basePrice: true, maxAdults: true } }),
    db.booking.findMany({ where: { status: { not: "CANCELLED" }, ...overlap }, select: { roomId: true } }),
    db.roomBlock.findMany({
      where: { startDate: { lt: q.checkOut }, endDate: { gt: q.checkIn } },
      select: { roomId: true },
    }),
    db.rateOverride.findMany({ where: { startDate: { lt: q.checkOut }, endDate: { gt: q.checkIn } } }),
  ]);

  const booked = new Set(bookings.map((b) => b.roomId));
  const blocked = new Set(blocks.map((b) => b.roomId));
  const result = new Map<string, RoomAvailability>();

  for (const room of rooms) {
    const base = Number(room.basePrice);
    let minNights = 1;
    const nightly = nights.map((night) => {
      const covering = rates.filter((r) => r.startDate <= night && r.endDate > night && (r.roomId === room.id || r.roomId === null));
      for (const r of covering) minNights = Math.max(minNights, r.minNights);
      const rate = covering.find((r) => r.roomId === room.id) ?? covering.find((r) => r.roomId === null);
      let price = base;
      if (rate?.price != null) price = Number(rate.price);
      else if (rate?.percent != null) price = Math.round(base * (1 + rate.percent / 100));
      return { date: toISO(night), price };
    });
    const total = nightly.reduce((s, n) => s + n.price, 0);

    let reason: RoomAvailability["reason"] = null;
    if (booked.has(room.id)) reason = "booked";
    else if (blocked.has(room.id)) reason = "blocked";
    // children don't block a room until the owner's child policy is known
    else if (q.adults > room.maxAdults) reason = "capacity";
    else if (q.nights < minNights) reason = "min_nights";

    result.set(room.id, {
      roomId: room.id,
      available: reason === null,
      reason,
      minNights,
      nightly,
      total,
      perNight: Math.round(total / Math.max(1, q.nights)),
    });
  }
  return result;
}
