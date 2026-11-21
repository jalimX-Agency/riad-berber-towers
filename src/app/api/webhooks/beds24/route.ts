import { timingSafeEqual } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { pullFromBeds24 } from "@/lib/beds24/pull";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Beds24 → Settings → Properties → Access → Booking Webhook:
//   https://riadberbertowers.com/api/webhooks/beds24?key=<BEDS24_WEBHOOK_SECRET>
// Every new, changed or cancelled booking (Booking.com, Airbnb…) calls it; the site then re-reads Beds24 and updates
// its availability. The payload is ignored on purpose: Beds24 stays the source of truth, nothing in the body is trusted.
function authorised(req: NextRequest) {
  const secret = process.env.BEDS24_WEBHOOK_SECRET;
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!secret || secret.length < 16) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  after(async () => {
    const r = await pullFromBeds24();
    if (!r.ok) console.error("[beds24] webhook pull failed:", r.error);
  });
  return NextResponse.json({ ok: true });
}

export const POST = handle;
export const GET = handle;
