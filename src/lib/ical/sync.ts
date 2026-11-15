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

    // write only what changed: most syncs find the same stays as last time
    const existing = await db.roomBlock.findMany({
      where: { feedId: feed.id },
      select: { id: true, externalUid: true, startDate: true, endDate: true, roomId: true, reason: true },
    });
    const byUid = new Map(existing.map((b) => [b.externalUid, b]));
    const seen = new Set(events.map((e) => e.uid));
    const gone = existing.filter((b) => !b.externalUid || !seen.has(b.externalUid)).map((b) => b.id);
    const fresh = events.filter((e) => !byUid.has(e.uid));
    const changed = events.filter((e) => {
      const b = byUid.get(e.uid);
      return b && (b.startDate.getTime() !== e.start.getTime() || b.endDate.getTime() !== e.end.getTime() || b.roomId !== feed.roomId || b.reason !== e.summary.slice(0, 120));
    });

    if (gone.length || fresh.length || changed.length) {
      await db.$transaction(
        [
          ...(gone.length ? [db.roomBlock.deleteMany({ where: { id: { in: gone } } })] : []),
          ...(fresh.length
            ? [
                db.roomBlock.createMany({
                  data: fresh.map((e) => ({ roomId: feed.roomId, feedId: feed.id, externalUid: e.uid, startDate: e.start, endDate: e.end, source: "ICAL" as const, reason: e.summary.slice(0, 120) })),
                  skipDuplicates: true,
                }),
              ]
            : []),
          ...changed.map((e) =>
            db.roomBlock.update({ where: { id: byUid.get(e.uid)!.id }, data: { startDate: e.start, endDate: e.end, roomId: feed.roomId, reason: e.summary.slice(0, 120) } }),
          ),
        ],
      );
    }

    await db.icalFeed.update({ where: { id: feed.id }, data: { lastSyncedAt: new Date(), lastError: null } });
    return { ok: true, events: events.length };
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 200) : "Erreur inconnue";
    await db.icalFeed.update({ where: { id: feed.id }, data: { lastError: error, lastSyncedAt: new Date() } });
    return { ok: false, error };
  }
}

/** Feeds are fetched a few at a time: 14 feeds one after the other could exceed the function time limit. */
const CONCURRENCY = 4;

export async function syncAllFeeds() {
  const feeds = await db.icalFeed.findMany({ where: { active: true }, select: { id: true } });
  const results: Awaited<ReturnType<typeof syncFeed>>[] = [];
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    results.push(...(await Promise.all(feeds.slice(i, i + CONCURRENCY).map((f) => syncFeed(f.id)))));
  }
  return { feeds: feeds.length, ok: results.filter((r) => r.ok).length };
}
