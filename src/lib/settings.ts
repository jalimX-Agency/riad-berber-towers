import { db } from "@/lib/db";
import { site } from "@/lib/site";

/** Settings the owner edits in /admin/settings. Stored in the Setting table (key → JSON value). */
export type SiteSettings = {
  /** PayPal.me name for the deposit link on the guest payment page ("" = ask the guest to contact us) */
  paypalMe: string;
  /** where new requests and payment proofs are announced */
  adminEmail: string;
};

const KEYS = ["paypalMe", "adminEmail"] as const;

/** "https://www.paypal.me/RiadBT/20" or "@RiadBT" → "RiadBT"; "" when it doesn't look like a PayPal.me name. */
export function normalizePaypalMe(raw: string) {
  const name = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?paypal\.(me|com\/paypalme)\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  return /^[A-Za-z0-9._-]{1,40}$/.test(name) ? name : "";
}

/** Saved values, falling back to the environment (PAYPAL_ME, EMAIL_ADMIN) and then the riad's address. */
export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.setting.findMany({ where: { key: { in: [...KEYS] } } });
  const saved = (k: (typeof KEYS)[number]) => {
    const v = rows.find((r) => r.key === k)?.value;
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    paypalMe: saved("paypalMe") || site.paypalMe,
    adminEmail: saved("adminEmail") || process.env.EMAIL_ADMIN || site.email,
  };
}

export async function saveSettings(values: SiteSettings) {
  await db.$transaction(
    KEYS.map((key) => db.setting.upsert({ where: { key }, update: { value: values[key] }, create: { key, value: values[key] } })),
  );
}
