import { db } from "@/lib/db";
import { addDays, todayInImlil } from "@/lib/booking/dates";
import { isSafeFeedUrl, parseIcal } from "./ical";

const MAX_BYTES = 2_000_000;

/**
 * Import one Booking.com / Airbnb feed as room blocks (source ICAL).
 * The feed is the truth for its own blocks: new events are added, changed ones updated,
 * and events that disappeared (a cancellation on the platform) are removed.
 */
export async function syncFeed(feedId: string): Promise<{ ok: boolean; events?: number; error?: string }> {
  const feed = await db.icalFeed.findUnique({ where: { id: feedId } });
  if (!feed || !feed.active) return { ok: false, error: "inactive" };
  try {
    if (!isSafeFeedUrl(feed.url)) throw new Error("URL refusée (https public uniquement)");
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "RiadBerberTowers-iCal/1.0" }, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new Error("Fichier trop volumineux");
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Ce lien ne renvoie pas un calendrier iCal");

    const today = todayInImlil();
    const horizon = addDays(today, 730);
    const events = parseIcal(text).filter((e) => e.end > today && e.start < horizon);

    await db.$transaction(async (tx) => {
      await tx.roomBlock.deleteMany({ where: { feedId: feed.id, externalUid: { notIn: events.map((e) => e.uid) } } });
      for (const e of events) {
        await tx.roomBlock.upsert({
          where: { feedId_externalUid: { feedId: feed.id, externalUid: e.uid } },
          update: { startDate: e.start, endDate: e.end, roomId: feed.roomId, reason: e.summary.slice(0, 120) },
          create: { roomId: feed.roomId, feedId: feed.id, externalUid: e.uid, startDate: e.start, endDate: e.end, source: "ICAL", reason: e.summary.slice(0, 120) },
        });
      }
    }, { maxWait: 10_000, timeout: 30_000 });

    await db.icalFeed.update({ where: { id: feed.id }, data: { lastSyncedAt: new Date(), lastError: null } });
    return { ok: true, events: events.length };
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 200) : "Erreur inconnue";
    await db.icalFeed.update({ where: { id: feed.id }, data: { lastError: error, lastSyncedAt: new Date() } });
    return { ok: false, error };
  }
}

export async function syncAllFeeds() {
  const feeds = await db.icalFeed.findMany({ where: { active: true }, select: { id: true } });
  const results = [];
  for (const f of feeds) results.push(await syncFeed(f.id));
  return { feeds: feeds.length, ok: results.filter((r) => r.ok).length };
}
