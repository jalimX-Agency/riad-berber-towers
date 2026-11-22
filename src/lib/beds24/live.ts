import { addDays, toISO } from "@/lib/booking/dates";
import { b24, beds24Configured } from "./client";
import { beds24RoomId } from "./rooms";

/**
 * Last check before the site takes a booking: ask Beds24 directly whether the room is still free on every night.
 * A Booking.com or Airbnb reservation reaches Beds24 instantly but the site only learns about it at the next sync,
 * so this closes that gap. Returns true (free), false (sold on a platform or closed) or null (Beds24 unreachable or
 * too slow: the site's own check still applies and the owner reviews every request).
 */
export async function beds24HasRoom(slug: string, checkIn: Date, checkOut: Date, timeoutMs = 6000): Promise<boolean | null> {
  if (!beds24Configured()) return null;
  const roomId = beds24RoomId(slug);
  if (!roomId) return null;
  const ask = b24<{ data?: { calendar?: { numAvail?: number }[] }[] }>(
    "GET",
    `/inventory/rooms/calendar?roomId=${roomId}&startDate=${toISO(checkIn)}&endDate=${toISO(addDays(checkOut, -1))}&includeNumAvail=true`,
  )
    .then((res) => {
      const segments = res.data?.[0]?.calendar ?? [];
      if (!segments.length) return null;
      return segments.every((s) => (s.numAvail ?? 0) > 0);
    })
    .catch(() => null);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([ask, timeout]);
}

type B24Booking = { id: number; status: string; arrival: string; departure: string; reference?: string; channel?: string; apiSource?: string; firstName?: string; lastName?: string };

/**
 * Before the riad confirms (or accepts) one of its own bookings: is there, in Beds24, ANOTHER booking or a closure on
 * those nights? The booking itself is already in Beds24 (pushed when it was made), so it is excluded by its reference.
 * Returns a short description of the conflict, null when free, or "unknown" when Beds24 can't be asked right now.
 */
export async function beds24Conflict(slug: string, checkIn: Date, checkOut: Date, ownReference: string, timeoutMs = 8000): Promise<string | null | "unknown"> {
  if (!beds24Configured()) return "unknown";
  const roomId = beds24RoomId(slug);
  if (!roomId) return null;
  const ask = (async () => {
    const [bookings, cal] = await Promise.all([
      b24<{ data?: B24Booking[] }>("GET", `/bookings?roomId=${roomId}&arrivalTo=${toISO(checkOut)}&departureFrom=${toISO(checkIn)}`),
      b24<{ data?: { calendar?: { override?: string }[] }[] }>(
        "GET",
        `/inventory/rooms/calendar?roomId=${roomId}&startDate=${toISO(checkIn)}&endDate=${toISO(addDays(checkOut, -1))}&includeOverride=true`,
      ),
    ]);
    const other = (bookings.data ?? []).find(
      (b) => b.status !== "cancelled" && b.status !== "inquiry" && b.reference !== ownReference && b.arrival < toISO(checkOut) && b.departure > toISO(checkIn),
    );
    if (other) {
      const who = [other.firstName, other.lastName].filter(Boolean).join(" ");
      const where = other.channel === "booking" ? "Booking.com" : other.channel === "airbnb" ? "Airbnb" : other.channel === "expedia" ? "Expedia" : (other.apiSource ?? "Beds24");
      return `réservation ${where}${who ? ` de ${who}` : ""} (${other.arrival} → ${other.departure})`;
    }
    if ((cal.data?.[0]?.calendar ?? []).some((s) => s.override === "blackout")) return "nuits fermées dans Beds24";
    return null;
  })().catch(() => "unknown" as const);
  const timeout = new Promise<"unknown">((resolve) => setTimeout(() => resolve("unknown"), timeoutMs));
  return Promise.race([ask, timeout]);
}
