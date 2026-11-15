"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/admin/guard";
import { isSafeFeedUrl } from "@/lib/ical/ical";
import { syncAllFeeds, syncFeed } from "@/lib/ical/sync";

const back = (params: Record<string, string>): never => {
  revalidatePath("/admin", "layout");
  redirect(`/admin/channels?${new URLSearchParams(params)}`);
};

const CHANNELS = ["booking.com", "airbnb", "other"];

export async function addFeed(form: FormData) {
  await requireUser();
  const slug = String(form.get("room") ?? "");
  const channel = CHANNELS.includes(String(form.get("channel"))) ? String(form.get("channel")) : "other";
  const url = String(form.get("url") ?? "").trim();
  const room = await db.room.findUnique({ where: { slug }, select: { id: true } });
  if (!room || !isSafeFeedUrl(url) || url.length > 1000) back({ error: "url" });
  const feed = await db.icalFeed.create({ data: { roomId: room!.id, channel, url } });
  // import right away so the owner sees the result
  const r = await syncFeed(feed.id);
  back(r.ok ? { done: "added", events: String(r.events ?? 0) } : { error: "sync", detail: r.error ?? "" });
}

export async function removeFeed(id: string) {
  await requireUser();
  // its imported blocks go with it (onDelete: Cascade)
  await db.icalFeed.delete({ where: { id } });
  back({ done: "removed" });
}

export async function syncNow() {
  await requireUser();
  const r = await syncAllFeeds();
  back({ done: "synced", ok: String(r.ok), total: String(r.feeds) });
}
