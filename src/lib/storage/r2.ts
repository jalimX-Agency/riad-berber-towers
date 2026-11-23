import { createHmac } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 (S3 API) for every file the site stores: site photos, brand images and the guests' payment proofs.
 * Nothing heavy goes into the database (free Neon plan: 0.5 GB).
 *
 * Payment proofs hold personal data. The bucket is served publicly for the site photos (NEXT_PUBLIC_R2_URL), so a
 * proof's object key is an HMAC of its id with a server secret: impossible to guess, never sent to a browser. The
 * team reads proofs only through the signed-in admin route, which fetches them from R2 server-side.
 * Set R2_PRIVATE_BUCKET_NAME to keep proofs in a separate, non-public bucket.
 */

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
const PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET_NAME || R2_BUCKET_NAME;

let client: S3Client | null = null;
function s3() {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID ?? "", secretAccessKey: R2_SECRET_ACCESS_KEY ?? "" },
  });
  return client;
}

export const r2Configured = () => Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && PRIVATE_BUCKET);

/** Object key of a payment proof (stable, unguessable without the server secret). */
export function proofKey(proofId: string) {
  const secret = process.env.R2_PROOF_SECRET || process.env.NEXTAUTH_SECRET || "";
  return `private/proofs/${createHmac("sha256", secret).update(proofId).digest("hex").slice(0, 40)}`;
}

export async function putPrivate(key: string, body: Uint8Array, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: "private, no-store" }));
}

export async function getPrivate(key: string): Promise<Uint8Array | null> {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }));
    return res.Body ? await res.Body.transformToByteArray() : null;
  } catch (e) {
    if ((e as { name?: string }).name === "NoSuchKey") return null;
    throw e;
  }
}

/** Remove private files (proofs of a booking deleted for good). Never throws. */
export async function deletePrivate(keys: string[]) {
  if (!r2Configured()) return;
  for (const key of keys) {
    try {
      await s3().send(new DeleteObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }));
    } catch (e) {
      console.error("[r2] delete failed", key, e);
    }
  }
}
