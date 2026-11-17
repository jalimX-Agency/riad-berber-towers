import { COOKING, OUTINGS, activitiesCopy } from "@/lib/activities";
import { DINNER_SLUG, TRANSFER_SLUG } from "./extras";

type Saved = { quantity: number; total: { toString(): string } | number; extra: { slug: string } };

/**
 * Lines for a saved booking's extras, in the given language: activity name × people and price,
 * or the transfer (fixed price; 0 on bookings made before it had one). `transferLabel` comes from messages (book.transfer.title).
 */
export function extraLines(extras: Saved[], locale: string, transferLabel: string, dinnerLabel = "Dinner") {
  const c = activitiesCopy(locale);
  return extras.map((e) => {
    if (e.extra.slug === TRANSFER_SLUG) return { slug: e.extra.slug, name: transferLabel, people: 0, total: Number(e.total), transfer: true };
    // dinner: people = covers (people × evenings)
    if (e.extra.slug === DINNER_SLUG) return { slug: e.extra.slug, name: dinnerLabel, people: e.quantity, total: Number(e.total), transfer: false };
    const o = OUTINGS.find((x) => x.slug === e.extra.slug);
    const name = o ? c.outings.items[o.id].name : e.extra.slug === COOKING.slug ? c.cooking.title : e.extra.slug;
    return { slug: e.extra.slug, name, people: e.quantity, total: Number(e.total), transfer: false };
  });
}

/** Prisma include for the lines above */
export const extrasInclude = { extras: { select: { quantity: true, total: true, extra: { select: { slug: true } } } } } as const;
