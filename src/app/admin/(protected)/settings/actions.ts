"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManage, requireUser } from "@/lib/admin/guard";
import { ROOMS_TAG } from "@/lib/admin/rooms";
import { db } from "@/lib/db";
import { normalizeIban, normalizePaypalMe, normalizeWiseLink, saveSettings } from "@/lib/settings";

const back = (params: Record<string, string>): never => {
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?${new URLSearchParams(params)}`);
};

const schema = z.object({
  paypalMe: z.string().trim().max(200),
  adminEmail: z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(160)),
  wiseLink: z.string().trim().max(200).default(""),
  bankName: z.string().trim().max(120).default(""),
  bankHolder: z.string().trim().max(120).default(""),
  bankCurrency: z.string().trim().toUpperCase().max(3).default(""),
  bankIban: z.string().trim().max(60).default(""),
  bankSwift: z.string().trim().toUpperCase().max(11).default(""),
});

/** Owner and admins only: these settings decide where money and notifications go. */
export async function updateSettings(form: FormData) {
  const user = await requireUser();
  if (!canManage(user.role)) back({ error: "role" });
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) back({ error: "email" });
  const { paypalMe: raw, adminEmail, wiseLink: rawWise, bankIban: rawIban, ...bank } = p.data!;
  const paypalMe = normalizePaypalMe(raw);
  if (raw && !paypalMe) back({ error: "paypal" });
  const wiseLink = normalizeWiseLink(rawWise);
  if (rawWise && !wiseLink) back({ error: "wise" });
  const bankIban = normalizeIban(rawIban);
  if (rawIban && !bankIban) back({ error: "iban" });
  if (bank.bankSwift && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bank.bankSwift)) back({ error: "swift" });
  await saveSettings({ paypalMe, adminEmail, wiseLink, bankIban, ...bank });
  back({ done: "1" });
}

/**
 * Default nightly price of each room on the site (breakfast included). Used where the calendar has no price of its own,
 * and printed on the public pages ("from 72 €"), so those pages are revalidated.
 */
export async function saveBasePrices(form: FormData) {
  const user = await requireUser();
  if (!canManage(user.role)) back({ error: "role" });
  const updates: { id: string; price: number }[] = [];
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("price_")) continue;
    const price = Number(v);
    if (!Number.isFinite(price) || price < 1 || price > 10_000) back({ error: "price" });
    updates.push({ id: k.slice(6), price: Math.round(price) });
  }
  await db.$transaction(updates.map((u) => db.room.update({ where: { id: u.id }, data: { basePrice: u.price } })));
  revalidatePath("/", "layout");
  revalidateTag(ROOMS_TAG);
  back({ done: "prices" });
}
