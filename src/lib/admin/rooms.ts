import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export const ROOMS_TAG = "admin-rooms";

export type AdminRoom = { id: string; slug: string; name: string; basePrice: number; currency: string };

async function loadRooms(): Promise<AdminRoom[]> {
  const rooms = await db.room.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, slug: true, name: true, basePrice: true, currency: true },
  });
  return rooms.map((r) => ({ ...r, basePrice: Number(r.basePrice) }));
}

/**
 * Active rooms for admin filters and grids. Rooms almost never change, so they are cached
 * across requests; base-price changes call revalidateTag(ROOMS_TAG).
 */
export const getActiveRooms: () => Promise<AdminRoom[]> = unstable_cache(loadRooms, ["admin-active-rooms"], { tags: [ROOMS_TAG], revalidate: 86_400 });
