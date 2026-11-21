import { NextRequest, NextResponse } from "next/server";
import { pullFromBeds24 } from "@/lib/beds24/pull";
import { reconcileToBeds24 } from "@/lib/beds24/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily safety net: push to Beds24 what failed to go through, then re-read Beds24.
// Vercel Cron calls it with "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const push = await reconcileToBeds24();
  const pull = await pullFromBeds24();
  return NextResponse.json({ push, pull });
}
