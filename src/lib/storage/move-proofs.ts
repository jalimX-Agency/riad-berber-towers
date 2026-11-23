import { db } from "@/lib/db";
import { getPrivate, proofKey, putPrivate, r2Configured } from "./r2";

/**
 * Move payment proofs still stored in the database to R2 (older uploads), a few at a time so the daily cron stays
 * short. Each file is uploaded, read back and compared before its bytes are removed from the database.
 */
export async function moveProofsToR2(limit = 25): Promise<{ moved: number; left: number; failed: number }> {
  if (!r2Configured()) return { moved: 0, left: 0, failed: 0 };
  // only ids first: never load many files into memory at once
  const ids = (await db.$queryRaw<{ id: string }[]>`SELECT "id" FROM "PaymentProof" WHERE octet_length("data") > 0 ORDER BY "createdAt" ASC LIMIT ${limit}`).map((r) => r.id);
  let moved = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const p = await db.paymentProof.findUnique({ where: { id }, select: { data: true, mimeType: true } });
      if (!p || !p.data.length) continue;
      const bytes = new Uint8Array(p.data);
      await putPrivate(proofKey(id), bytes, p.mimeType);
      const back = await getPrivate(proofKey(id));
      if (!back || back.length !== bytes.length) throw new Error("R2 copy does not match");
      await db.paymentProof.update({ where: { id }, data: { data: new Uint8Array(0) } });
      moved++;
    } catch (e) {
      failed++;
      console.error("[proofs] move to R2 failed", id, e);
    }
  }
  const [{ n }] = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "PaymentProof" WHERE octet_length("data") > 0`;
  return { moved, left: Number(n), failed };
}
