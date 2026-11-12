import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Use at the top of every /api/admin route. Returns a 401 response, or null when the caller is signed in. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
