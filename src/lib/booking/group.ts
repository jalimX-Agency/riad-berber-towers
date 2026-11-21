import type { BookingStatus, Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { OTA_REF_PREFIX } from "@/lib/beds24/rooms";
import { bookingPayment } from "./payment";

/**
 * A reservation of several rooms is stored as one booking per room (each room is sold, closed on Booking.com /
 * Airbnb and cancelled on its own), all for the same guest and the same dates. Those bookings form a group:
 * the admin shows them as one reservation, status changes apply to all of them, and the voucher, the payment
 * page and the emails list every room with the summed amounts.
 *
 * Members: same guest, same arrival and departure, not mirrored from Booking.com / Airbnb, and on the same side
 * of "cancelled" as the booking asked about (a cancelled room is not dragged back by its active siblings).
 */
const INACTIVE: BookingStatus[] = ["CANCELLED", "NO_SHOW"];

type Client = PrismaClient | Prisma.TransactionClient;

export async function groupMembers<T extends Prisma.BookingInclude>(id: string, include: T, client: Client = db) {
  const self = await client.booking.findUnique({ where: { id }, select: { guestId: true, checkIn: true, checkOut: true, status: true, reference: true } });
  if (!self) return [];
  if (self.reference.startsWith(OTA_REF_PREFIX)) {
    return client.booking.findMany({ where: { id }, include }) as unknown as Promise<Prisma.BookingGetPayload<{ include: T }>[]>;
  }
  const inactive = INACTIVE.includes(self.status);
  return client.booking.findMany({
    where: {
      guestId: self.guestId,
      checkIn: self.checkIn,
      checkOut: self.checkOut,
      reference: { not: { startsWith: OTA_REF_PREFIX } },
      OR: [{ id }, { status: inactive ? { in: INACTIVE } : { notIn: INACTIVE } }],
    },
    orderBy: [{ room: { order: "asc" } }, { createdAt: "asc" }],
    include,
  }) as unknown as Promise<Prisma.BookingGetPayload<{ include: T }>[]>;
}

/** Ids of the bookings that form the same reservation (at least the booking itself). */
export async function groupIds(id: string, client: Client = db) {
  const rows = await groupMembers(id, {}, client);
  return rows.length ? rows.map((r) => r.id) : [id];
}

/** Summed total, deposit and balance of the rooms of one reservation. */
export function groupPayment(rows: { total: Prisma.Decimal | number; depositAmount: Prisma.Decimal | number }[]) {
  return rows.reduce(
    (s, r) => {
      const p = bookingPayment(r);
      return { total: s.total + p.total, deposit: s.deposit + p.deposit, balance: s.balance + p.balance };
    },
    { total: 0, deposit: 0, balance: 0 },
  );
}
