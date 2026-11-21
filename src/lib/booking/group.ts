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
 * "Same guest" means the same person (name, phone, email), not the same Guest row: a phone guest without an
 * email used to get a new Guest row for each room.
 * Members: same guest, same arrival and departure, not mirrored from Booking.com / Airbnb, and on the same side
 * of "cancelled" as the booking asked about (a cancelled room is not dragged back by its active siblings).
 */
const INACTIVE: BookingStatus[] = ["CANCELLED", "NO_SHOW"];

type Client = PrismaClient | Prisma.TransactionClient;

/** Key of one reservation, for grouping rows already loaded (lists, dashboard, counters). */
export function groupKey(b: { id: string; reference: string; checkIn: Date; checkOut: Date; guest: { firstName: string; lastName: string; phone: string; email: string } }) {
  if (b.reference.startsWith(OTA_REF_PREFIX)) return b.id;
  const g = b.guest;
  return [g.firstName.trim().toLowerCase(), g.lastName.trim().toLowerCase(), g.phone.replace(/\D/g, ""), g.email.trim().toLowerCase(), b.checkIn.toISOString(), b.checkOut.toISOString()].join("|");
}
export const groupGuestSelect = { firstName: true, lastName: true, phone: true, email: true } as const;

export async function groupMembers<T extends Prisma.BookingInclude>(id: string, include: T, client: Client = db) {
  type Row = Prisma.BookingGetPayload<{ include: T }>;
  const self = await client.booking.findUnique({
    where: { id },
    select: { checkIn: true, checkOut: true, status: true, reference: true, guest: { select: groupGuestSelect } },
  });
  if (!self) return [] as Row[];
  if (self.reference.startsWith(OTA_REF_PREFIX)) return (await client.booking.findMany({ where: { id }, include })) as unknown as Row[];
  const inactive = INACTIVE.includes(self.status);
  const g = self.guest;
  const rows = (await client.booking.findMany({
    where: {
      checkIn: self.checkIn,
      checkOut: self.checkOut,
      reference: { not: { startsWith: OTA_REF_PREFIX } },
      guest: { firstName: { equals: g.firstName.trim(), mode: "insensitive" }, lastName: { equals: g.lastName.trim(), mode: "insensitive" } },
      OR: [{ id }, { status: inactive ? { in: INACTIVE } : { notIn: INACTIVE } }],
    },
    orderBy: [{ room: { order: "asc" } }, { createdAt: "asc" }],
    include: { ...include, guest: { select: groupGuestSelect } } as Prisma.BookingInclude,
  })) as unknown as (Row & { guest: { firstName: string; lastName: string; phone: string; email: string } })[];
  // same phone and email too (the name alone could be two different people)
  const me = groupKey({ id, reference: self.reference, checkIn: self.checkIn, checkOut: self.checkOut, guest: g });
  return rows.filter((r) => r.id === id || groupKey({ id: r.id, reference: r.reference, checkIn: r.checkIn, checkOut: r.checkOut, guest: r.guest }) === me) as unknown as Row[];
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
