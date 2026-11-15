import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * First line of every admin server action and page: the caller must be signed in,
 * and the account must still exist (a deleted user's 12 h session stops working at once).
 * cache(): the layout and the page of one request share a single lookup.
 * The role comes from the database, not the session, so a changed role applies at once.
 */
export const requireUser = cache(async () => {
  const session = await getSession();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) redirect("/admin/login");
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } });
  if (!user) redirect("/admin/login");
  return user;
});

/** Prices, seasonal rates, channel feeds and settings: owner and admins only. */
export const canManage = (role: Role) => role === "OWNER" || role === "ADMIN";

/** For server actions that change money-related settings. Throws (shown by the admin error page) for staff. */
export async function requireManager() {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("Action réservée au propriétaire et aux administrateurs.");
  return user;
}
