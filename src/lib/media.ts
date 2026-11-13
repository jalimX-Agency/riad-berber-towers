/**
 * Images are stored by key (e.g. "rooms/toubkal/01.webp") in the database.
 * Production serves them from Cloudflare R2 (NEXT_PUBLIC_R2_URL).
 * Until R2 is configured, they fall back to the local copy in public/media (dev only, not committed).
 */
const R2 = process.env.NEXT_PUBLIC_R2_URL?.replace(/\/$/, "");

export function mediaUrl(key: string | null | undefined): string {
  if (!key) return "";
  if (/^https?:\/\//.test(key)) return key; // already a full URL
  return R2 ? `${R2}/${key}` : `/media/${key}`;
}
