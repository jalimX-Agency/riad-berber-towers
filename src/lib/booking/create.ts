import { randomInt } from "node:crypto";
import { Prisma, type Locale } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAvailability, type RoomAvailability, type StayQuery } from "./availability";
import { ARRIVAL_TIMES } from "./arrival";

/** Unambiguous alphabet (no 0/O, 1/I/L) so guests can read the reference over the phone. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newReference = () => `RBT-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;


/** Max open (pending) requests per email in 24 h: stops a bot or a double-click from filling the calendar. */
const MAX_PENDING_PER_EMAIL = 3;

export const guestSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(160)),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(30)
    .regex(/^[+\d\s().-]+$/),
  country: z.string().trim().max(60).default(""),
  arrivalTime: z.enum(ARRIVAL_TIMES).default("unknown"),
  specialRequests: z.string().trim().max(1000).default(""),
});
export type GuestInput = z.infer<typeof guestSchema>;

export type CreateResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; error: "unavailable"; reason: RoomAvailability["reason"] }
  | { ok: false; error: "too_many" };

/**
 * Create a booking request (status PENDING, pay at the riad).
 * Price and availability are recomputed inside the transaction; nothing from the browser is trusted.
 * A per-room advisory lock serialises concurrent requests for the same room, so two guests
 * can't both get the last nights.
 */
export async function createBooking(input: {
  roomSlug: string;
  query: StayQuery;
  guest: GuestInput;
  locale: Locale;
}): Promise<CreateResult> {
  const { query, guest } = input;
  const room = await db.room.findFirst({ where: { slug: input.roomSlug, active: true }, select: { id: true, currency: true } });
  if (!room) return { ok: false, error: "unavailable", reason: null };

  const recent = await db.booking.count({
    where: { status: "PENDING", guest: { email: guest.email }, createdAt: { gt: new Date(Date.now() - 86_400_000) } },
  });
  if (recent >= MAX_PENDING_PER_EMAIL) return { ok: false, error: "too_many" };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${room.id}))::text`;

          const a = (await getAvailability(query, { roomId: room.id, client: tx })).get(room.id);
          if (!a || !a.available) return { ok: false as const, error: "unavailable" as const, reason: a?.reason ?? null };

          const existing = await tx.guest.findFirst({ where: { email: guest.email }, orderBy: { createdAt: "desc" }, select: { id: true } });
          const guestData = {
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            country: guest.country,
            locale: input.locale,
          };
          const g = existing
            ? await tx.guest.update({ where: { id: existing.id }, data: guestData, select: { id: true } })
            : await tx.guest.create({ data: guestData, select: { id: true } });

          const booking = await tx.booking.create({
            data: {
              reference: newReference(),
              roomId: room.id,
              guestId: g.id,
              checkIn: query.checkIn,
              checkOut: query.checkOut,
              nights: query.nights,
              adults: query.adults,
              children: 0,
              status: "PENDING",
              source: "WEBSITE",
              roomTotal: a.total,
              total: a.total,
              currency: room.currency,
              nightlyRates: a.nightly,
              paymentMethod: "on_arrival",
              arrivalTime: guest.arrivalTime === "unknown" ? "" : guest.arrivalTime,
              specialRequests: guest.specialRequests,
              locale: input.locale,
            },
            select: { id: true, reference: true },
          });
          return { ok: true as const, ...booking };
        },
        // Neon can take a few seconds to wake a suspended compute
        { maxWait: 10_000, timeout: 15_000 },
      );
    } catch (e) {
      // reference collision (1 in ~900 million): try again with a new one
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 2) continue;
      throw e;
    }
  }
  throw new Error("unreachable");
}
