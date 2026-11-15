import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { addDays, todayInImlil } from "@/lib/booking/dates";
import { buildIcal, exportToken } from "@/lib/ical/ical";

export const dynamic = "force-dynamic";

// GET /api/ical/<room-slug>-<token>.ics : this room's occupied nights, for Booking.com / Airbnb to import.
// Exports our bookings and manual closures, never the blocks imported from those platforms (no echo loops).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = file.match(/^([a-z0-9-]+)-([a-f0-9]{32})\.ics$/);
  if (!m) return new Response("Not found", { status: 404 });
  const [, slug, token] = m;
  const expected = Buffer.from(exportToken(slug));
  if (expected.length !== token.length || !timingSafeEqual(expected, Buffer.from(token))) return new Response("Not found", { status: 404 });

  const room = await db.room.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!room) return new Response("Not found", { status: 404 });

  const from = addDays(todayInImlil(), -30);
  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({ where: { roomId: room.id, status: { notIn: ["CANCELLED", "NO_SHOW"] }, checkOut: { gt: from } }, select: { id: true, checkIn: true, checkOut: true } }),
    db.roomBlock.findMany({ where: { roomId: room.id, source: { not: "ICAL" }, endDate: { gt: from } }, select: { id: true, startDate: true, endDate: true } }),
  ]);

  // guest names stay private: platforms only need to know the nights are taken
  const body = buildIcal(`Riad Berber Towers · ${room.name}`, [
    ...bookings.map((b) => ({ uid: `b-${b.id}`, start: b.checkIn, end: b.checkOut, summary: "Reserved" })),
    ...blocks.map((k) => ({ uid: `k-${k.id}`, start: k.startDate, end: k.endDate, summary: "Not available" })),
  ]);
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store", "Content-Disposition": `inline; filename="${slug}.ics"` },
  });
}
