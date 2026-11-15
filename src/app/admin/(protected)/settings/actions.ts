"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManage, requireUser } from "@/lib/admin/guard";
import { normalizePaypalMe, saveSettings } from "@/lib/settings";

const back = (params: Record<string, string>): never => {
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?${new URLSearchParams(params)}`);
};

const schema = z.object({
  paypalMe: z.string().trim().max(200),
  adminEmail: z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(160)),
});

/** Owner and admins only: these settings decide where money and notifications go. */
export async function updateSettings(form: FormData) {
  const user = await requireUser();
  if (!canManage(user.role)) back({ error: "role" });
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) back({ error: "email" });
  const { paypalMe: raw, adminEmail } = p.data!;
  const paypalMe = normalizePaypalMe(raw);
  if (raw && !paypalMe) back({ error: "paypal" });
  await saveSettings({ paypalMe, adminEmail });
  back({ done: "1" });
}
