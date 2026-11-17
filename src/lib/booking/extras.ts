// Activities and services a guest can add to a booking. Pure values: safe to import from client components.

/** Activities bookable with a stay (slug = the activity page). Price per person, in the room currency (EUR). */
export const ACTIVITY_EXTRAS = [
  { slug: "cooking-class", price: 45 },
  { slug: "tizi-mzik-tasghimoute", price: 45 },
  { slug: "sidi-chamharouch", price: 45 },
  { slug: "tidli-forest", price: 45 },
  { slug: "mountain-biking", price: 80 },
] as const;
export type ActivitySlug = (typeof ACTIVITY_EXTRAS)[number]["slug"];
export const activityPrice = (slug: string) => ACTIVITY_EXTRAS.find((a) => a.slug === slug)?.price ?? 0;

/** Private transfer from Marrakech (airport, hotel, riad…) to the house: one price per transfer (owner, Nov 2026). Other cities: on request. */
export const TRANSFER_SLUG = "transfer-marrakech";
export const TRANSFER_PRICE = 60;
/** Set dinner at the riad (restaurant menu): price per person and per evening. */
export const DINNER_SLUG = "dinner";
export const DINNER_PRICE = 15;
/** Price of any extra slug (activity per person, transfer per stay, dinner per person per evening) */
export const extraPrice = (slug: string) => (slug === TRANSFER_SLUG ? TRANSFER_PRICE : slug === DINNER_SLUG ? DINNER_PRICE : activityPrice(slug));
export const TRANSFER_PICKUPS = ["airport", "hotel", "other"] as const;
export type TransferPickup = (typeof TRANSFER_PICKUPS)[number];

/** Most people one activity can be booked for (private outings: couples, families, small groups). */
export const MAX_EXTRA_PEOPLE = 12;

export type ExtraChoice = { slug: ActivitySlug; people: number };
export type TransferChoice = { from: TransferPickup; details: string };
export type DinnerChoice = { people: number; evenings: number };

const clampPeople = (n: number) => Math.min(MAX_EXTRA_PEOPLE, Math.max(1, Math.round(n)));

/** Read the wizard's fields: extra_<slug> = people, transfer = "1", transferFrom, transferDetails. */
export function parseExtras(get: (key: string) => string): { activities: ExtraChoice[]; transfer: TransferChoice | null; dinner: DinnerChoice | null } {
  const activities: ExtraChoice[] = [];
  for (const a of ACTIVITY_EXTRAS) {
    const n = Number(get(`extra_${a.slug}`));
    if (Number.isFinite(n) && n > 0) activities.push({ slug: a.slug, people: clampPeople(n) });
  }
  const from = get("transferFrom") as TransferPickup;
  const transfer =
    get("transfer") === "1"
      ? { from: (TRANSFER_PICKUPS as readonly string[]).includes(from) ? from : "other", details: get("transferDetails").trim().slice(0, 200) }
      : null;
  // dinner: people and evenings (the server caps evenings at the number of nights)
  const dp = Number(get("dinnerPeople"));
  const de = Number(get("dinnerEvenings"));
  const dinner = Number.isFinite(dp) && dp > 0 ? { people: clampPeople(dp), evenings: Math.max(1, Math.min(30, Math.round(Number.isFinite(de) ? de : 1))) } : null;
  return { activities, transfer, dinner };
}

export const extrasTotal = (activities: ExtraChoice[], transfer: TransferChoice | null, dinner: DinnerChoice | null = null) =>
  activities.reduce((s, a) => s + activityPrice(a.slug) * a.people, 0) + (transfer ? TRANSFER_PRICE : 0) + (dinner ? DINNER_PRICE * dinner.people * dinner.evenings : 0);
