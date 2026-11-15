import { requireUser } from "@/lib/admin/guard";
import { buildVoucher } from "@/lib/booking/voucher";

export const dynamic = "force-dynamic";

/** The reservation voucher PDF, for the team (print it, send it on WhatsApp…). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const v = await buildVoucher(id);
  if (!v) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(v.bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${v.filename}"`, "Cache-Control": "private, no-store" },
  });
}
