import { mediaUrl } from "@/lib/media";
import type { Locale } from "@/i18n/routing";
import en from "@/content/restaurant/en";
import fr from "@/content/restaurant/fr";
import es from "@/content/restaurant/es";
import de from "@/content/restaurant/de";
import ar from "@/content/restaurant/ar";

/** The owner's restaurant menu (Nov 2026). Prices in euros; null = price to be confirmed. */
export { DINNER_PRICE } from "@/lib/booking/extras";
export const DRINKS: { id: "coke" | "cokeZero" | "sprite" | "hawai" | "schweppes" | "orange"; price: number | null }[] = [
  { id: "coke", price: 2 },
  { id: "cokeZero", price: 2 },
  { id: "sprite", price: 2 },
  { id: "hawai", price: 2 },
  { id: "schweppes", price: 2 },
  { id: "orange", price: null },
];
export const SERVICE = { dinnerFrom: "18:00", dinnerTo: "21:00", orderBy: "14:00" } as const;

const p = (key: string, w: number, h: number) => ({ src: mediaUrl(`photos/restaurant/${key}.webp`), w, h });
export const restaurantMedia = {
  tagines: p("tagines-table", 1600, 1200),
  couscous: p("couscous-tagine", 1200, 1600),
  serving: p("serving", 1200, 1600),
  room: p("dining-room", 1600, 1200),
  breakfast: p("breakfast-table", 1200, 1600),
} as const;

export type RestaurantCopy = {
  meta: { title: string; description: string };
  label: string;
  title: string;
  lead: string;
  price: { per: string; what: string };
  card: { title: string; subtitle: string; footer: string };
  starters: { title: string; note: string; option: string; options: string[][] };
  mains: { title: string; note: string; items: string[] };
  dessert: { title: string; items: string[] };
  drinks: { title: string; names: Record<(typeof DRINKS)[number]["id"], string>; tbc: string };
  timing: { title: string; order: string; orderText: string; dinner: string; dinnerText: string; lunch: string; lunchText: string };
  diets: { title: string; text: string; items: string[] };
  alts: { tagines: string; couscous: string; serving: string; room: string };
  cta: { title: string; text: string; withRoom: string; roomLink: string; button: string; message: string };
};

const copy: Record<Locale, RestaurantCopy> = { en, fr, es, de, ar };
export const restaurantCopy = (locale: string) => copy[locale as Locale] ?? en;
