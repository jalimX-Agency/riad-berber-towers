import type { Locale } from "@/i18n/routing";
import en from "@/content/imlil/en";
import fr from "@/content/imlil/fr";
import es from "@/content/imlil/es";
import de from "@/content/imlil/de";
import ar from "@/content/imlil/ar";

/**
 * Imlil guide (researched Nov 2026: Wikipedia "Toubkal", travel guides on Imlil, Morocco World News, Maroc.ma).
 * Photo ids are Pexels photos stored in R2 (see PEXELS in lib/activities).
 */
export const GUIDE_PHOTOS = {
  hero: "29601658",
  village: "imlil/village",
  seasons: { spring: "5029303", summer: "37538525", autumn: "29601661", winter: "35449705" },
  places: { aroumd: "hikes/aroumd", chamharouch: "tp-im7", tamatert: "40922826", mzik: "35206443", toubkal: "36533362", asni: "7835692" },
} as const;

export type Season = keyof typeof GUIDE_PHOTOS.seasons;
export type Place = keyof typeof GUIDE_PHOTOS.places;

/** Places that have a matching activity page */
export const PLACE_ACTIVITY: Partial<Record<Place, string>> = { chamharouch: "sidi-chamharouch", mzik: "tizi-mzik-tasghimoute", aroumd: "sidi-chamharouch" };

export type GuideCopy = {
  meta: { title: string; description: string };
  hero: { label: string; title: string; lead: string; alt: string };
  facts: { value: string; label: string }[];
  toc: string;
  about: { label: string; title: string; paras: string[]; alt: string };
  when: { label: string; title: string; lead: string; best: string; seasons: Record<Season, { name: string; months: string; text: string }> };
  getting: { label: string; title: string; steps: { name: string; meta: string; text: string }[]; note: string; whatsapp: string; whatsappMessage: string };
  around: { label: string; title: string; lead: string; activity: string; places: Record<Place, { name: string; meta: string; text: string }> };
  toubkal: { label: string; title: string; paras: string[]; facts: { value: string; label: string }[] };
  /** Toubkal Peaks, the owner's agency */
  partner: { text: string; cta: string };
  transfer: string;
  practical: { label: string; title: string; items: { title: string; text: string }[] };
  cta: { title: string; text: string; rooms: string; activities: string };
};

const copy: Record<Locale, GuideCopy> = { en, fr, es, de, ar };
export const guideCopy = (locale: string) => copy[locale as Locale] ?? en;
