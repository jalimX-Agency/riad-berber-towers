import type { Prisma, RateOverride } from "@prisma/client";
import { addDays, eachNight, parseDay, toISO } from "@/lib/booking/dates";

/** The site's own (direct-booking) price and minimum stay for one night, same rules as getAvailability. */
export type SiteNight = { price: number; minNights: number; custom: boolean };

type Override = Pick<RateOverride, "roomId" | "startDate" | "endDate" | "price" | "percent" | "minNights">;

/** Price per night: room-specific override > house-wide override > base price. Minimum stay: the highest that applies. */
export function siteNight(room: { id: string; basePrice: number }, night: Date, overrides: Override[]): SiteNight {
  const covering = overrides.filter((r) => r.startDate <= night && r.endDate > night && (r.roomId === room.id || r.roomId === null));
  let minNights = 1;
  for (const r of covering) minNights = Math.max(minNights, r.minNights);
  const rate = covering.find((r) => r.roomId === room.id && (r.price != null || r.percent != null)) ?? covering.find((r) => r.roomId === null && (r.price != null || r.percent != null));
  let price = room.basePrice;
  if (rate?.price != null) price = Number(rate.price);
  else if (rate?.percent != null) price = Math.round(room.basePrice * (1 + rate.percent / 100));
  return { price, minNights, custom: Boolean(rate) };
}

type NightState = { price: number | null; percent: number | null; minNights: number; name: string };

/**
 * Set the site price and/or minimum stay of one room for a set of nights (the control calendar's "site" row).
 * Room-specific overrides touching those nights are rewritten so they never overlap: the parts outside the edited
 * nights keep their old values, the edited nights get the new ones, consecutive equal nights share one row.
 */
export async function setSiteNights(tx: Prisma.TransactionClient, roomId: string, isoNights: string[], change: { price?: number; minNights?: number }) {
  if (!isoNights.length || (change.price === undefined && change.minNights === undefined)) return;
  const sorted = [...new Set(isoNights)].sort();
  const first = parseDay(sorted[0])!;
  const endExclusive = addDays(parseDay(sorted[sorted.length - 1])!, 1);

  const overlapping = await tx.rateOverride.findMany({
    where: { roomId, startDate: { lt: endExclusive }, endDate: { gt: first } },
    orderBy: { createdAt: "asc" },
  });

  // current state of every night those rows cover (later rows win, as the newest edit should)
  const state = new Map<string, NightState>();
  for (const o of overlapping) {
    for (const n of eachNight(o.startDate, o.endDate)) {
      state.set(toISO(n), { price: o.price != null ? Number(o.price) : null, percent: o.percent, minNights: o.minNights, name: o.name });
    }
  }
  for (const iso of sorted) {
    const cur = state.get(iso) ?? { price: null, percent: null, minNights: 1, name: "Calendrier" };
    state.set(iso, {
      price: change.price !== undefined ? change.price : cur.price,
      percent: change.price !== undefined ? null : cur.percent,
      minNights: change.minNights !== undefined ? change.minNights : cur.minNights,
      name: "Calendrier",
    });
  }

  // rebuild: drop nights that say nothing (base price, 1 night), merge equal neighbours
  const nights = [...state.entries()].filter(([, s]) => s.price != null || s.percent != null || s.minNights > 1).sort(([a], [b]) => (a < b ? -1 : 1));
  const rows: { startDate: Date; endDate: Date; s: NightState }[] = [];
  for (const [iso, s] of nights) {
    const d = parseDay(iso)!;
    const last = rows[rows.length - 1];
    const same = last && last.endDate.getTime() === d.getTime() && last.s.price === s.price && last.s.percent === s.percent && last.s.minNights === s.minNights && last.s.name === s.name;
    if (same) last.endDate = addDays(d, 1);
    else rows.push({ startDate: d, endDate: addDays(d, 1), s });
  }

  if (overlapping.length) await tx.rateOverride.deleteMany({ where: { id: { in: overlapping.map((o) => o.id) } } });
  if (rows.length) {
    await tx.rateOverride.createMany({
      data: rows.map((r) => ({
        roomId,
        name: r.s.name.slice(0, 80),
        startDate: r.startDate,
        endDate: r.endDate,
        price: r.s.price != null ? Math.round(r.s.price) : null,
        percent: r.s.percent,
        minNights: Math.min(30, Math.max(1, r.s.minNights)),
      })),
    });
  }
}
