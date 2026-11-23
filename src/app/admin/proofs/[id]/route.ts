import { db } from "@/lib/db";
import { requireUser } from "@/lib/admin/guard";
import { getPrivate, proofKey } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";

/** A guest's payment proof, for the signed-in team only (never cached, never public). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const p = await db.paymentProof.findUnique({ where: { id }, select: { data: true, mimeType: true, filename: true } });
  if (!p) return new Response("Not found", { status: 404 });
  // stored in R2 (empty data in the database) or, for older proofs not moved yet, in the database
  const bytes = p.data.length ? new Uint8Array(p.data) : await getPrivate(proofKey(id));
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": p.mimeType,
      "Content-Disposition": `inline; filename="${p.filename.replace(/[^\w.\-]/g, "_")}"`,
      // a proof never changes: let the signed-in browser keep it instead of streaming it from the database again
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
