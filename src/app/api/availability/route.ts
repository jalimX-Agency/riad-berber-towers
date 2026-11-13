import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAvailability, parseStayQuery } from "@/lib/booking/availability";
import { toISO } from "@/lib/booking/dates";

export const dynamic = "force-dynamic";

// GET /api/availability?checkIn=2027-03-14&checkOut=2027-03-17&adults=2
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const { query, error } = parseStayQuery({
    checkIn: p.get("checkIn"),
    checkOut: p.get("checkOut"),
    adults: p.get("adults"),
    children: p.get("children"),
  });
  if (!query) return NextResponse.json({ error }, { status: 400 });

  const [availability, rooms] = await Promise.all([
    getAvailability(query),
    db.room.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, slug: true, currency: true } }),
  ]);

  return NextResponse.json(
    {
      checkIn: toISO(query.checkIn),
      checkOut: toISO(query.checkOut),
      nights: query.nights,
      adults: query.adults,
      rooms: rooms.map((r) => {
        const a = availability.get(r.id)!;
        return { slug: r.slug, currency: r.currency, available: a.available, reason: a.reason, minNights: a.minNights, total: a.total, perNight: a.perNight, nightly: a.nightly };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
