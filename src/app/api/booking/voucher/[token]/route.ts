import { db } from "@/lib/db";
import { buildVoucher } from "@/lib/booking/voucher";

export const dynamic = "force-dynamic";

/** GET /api/booking/voucher/<payToken>: the guest's reservation voucher, once the booking is confirmed. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{20,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const b = await db.booking.findFirst({ where: { payToken: token }, select: { id: true, status: true } });
  if (!b || !["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status)) return new Response("Not found", { status: 404 });
  const v = await buildVoucher(b.id);
  if (!v) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(v.bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${v.filename}"`, "Cache-Control": "private, no-store" },
  });
}
