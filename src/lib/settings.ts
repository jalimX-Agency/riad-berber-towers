import { db } from "@/lib/db";
import { site } from "@/lib/site";

/** Settings the owner edits in /admin/settings. Stored in the Setting table (key → JSON value). */
export type SiteSettings = {
  /** PayPal.me name for the deposit link on the guest payment page ("" = ask the guest to contact us) */
  paypalMe: string;
  /** where new requests and payment proofs are announced */
  adminEmail: string;
  /** Wise "pay me" link ("" = hidden on the payment page) */
  wiseLink: string;
  /** bank transfer details ("" IBAN = no bank transfer option) */
  bankName: string;
  bankHolder: string;
  bankCurrency: string;
  bankIban: string;
  bankSwift: string;
};

const KEYS = ["paypalMe", "adminEmail", "wiseLink", "bankName", "bankHolder", "bankCurrency", "bankIban", "bankSwift"] as const;

/** "wise.com/pay/me/omara1819" → "https://wise.com/pay/me/omara1819"; "" when it isn't a wise.com link. */
export function normalizeWiseLink(raw: string) {
  const v = raw.trim().replace(/^(?!https?:\/\/)/i, "https://");
  try {
    const u = new URL(v);
    return /(^|\.)wise\.com$/i.test(u.hostname) && u.protocol === "https:" ? `https://${u.hostname}${u.pathname.replace(/\/$/, "")}` : "";
  } catch {
    return "";
  }
}

/** IBAN without spaces, upper case: "MA64 0224 …" → "MA640224…"; "" when it doesn't look like an IBAN. */
export function normalizeIban(raw: string) {
  const v = raw.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v) ? v : "";
}

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
  // null = never saved (use the default); "" = saved empty on purpose (option switched off)
  const saved = (k: (typeof KEYS)[number]) => {
    const v = rows.find((r) => r.key === k)?.value;
    return typeof v === "string" ? v.trim() : null;
  };
  return {
    paypalMe: saved("paypalMe") || site.paypalMe,
    adminEmail: saved("adminEmail") || process.env.EMAIL_ADMIN || site.email,
    wiseLink: saved("wiseLink") ?? site.wiseLink,
    bankName: saved("bankName") ?? site.bank.name,
    bankHolder: saved("bankHolder") ?? site.bank.holder,
    bankCurrency: saved("bankCurrency") ?? site.bank.currency,
    bankIban: saved("bankIban") ?? site.bank.iban,
    bankSwift: saved("bankSwift") ?? site.bank.swift,
  };
}

export async function saveSettings(values: SiteSettings) {
  await db.$transaction(
    KEYS.map((key) => db.setting.upsert({ where: { key }, update: { value: values[key] }, create: { key, value: values[key] } })),
  );
}
