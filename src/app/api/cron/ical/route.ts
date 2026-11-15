import { NextRequest, NextResponse } from "next/server";
import { syncAllFeeds } from "@/lib/ical/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled import of every Booking.com / Airbnb feed.
// Vercel Cron (or any scheduler) calls it with "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await syncAllFeeds());
}
