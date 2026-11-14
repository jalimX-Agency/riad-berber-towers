import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * First line of every admin server action and page: the caller must be signed in,
 * and the account must still exist (a deleted user's 12 h session stops working at once).
 */
export async function requireUser() {
  const session = await getSession();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) redirect("/admin/login");
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } });
  if (!user) redirect("/admin/login");
  return user;
}
