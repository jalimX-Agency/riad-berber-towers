import { mediaUrl } from "@/lib/media";
import type { Photo } from "@/lib/home-media";
import type { Locale } from "@/i18n/routing";
import en from "@/content/activities/en";
import fr from "@/content/activities/fr";
import es from "@/content/activities/es";
import de from "@/content/activities/de";
import ar from "@/content/activities/ar";

/** Activities offered from the house (owner's list, Nov 2026). Prices are per person, in euros. */
export const OUTINGS = [
  { id: "mzik", slug: "tizi-mzik-tasghimoute", price: 45, level: [2, 2], photos: ["35206443", "37538523", "17492446"] },
  { id: "chamharouch", slug: "sidi-chamharouch", price: 45, level: [2, 2], photos: ["37587575", "35802018", "37538525"] },
  { id: "tidli", slug: "tidli-forest", price: 45, level: [1, 2], photos: ["37096594", "37096589", "29762229"] },
  { id: "bike", slug: "mountain-biking", price: 80, level: [1, 3], photos: ["30005517", "30005513", "29601661"] },
] as const;
export type OutingId = (typeof OUTINGS)[number]["id"];

export const COOKING = { slug: "cooking-class", price: 45, start: "11:00", end: "14:30" } as const;
export const ACTIVITY_SLUGS = [COOKING.slug, ...OUTINGS.map((o) => o.slug)];

/** Pexels photos (free licence), stored in R2 as photos/pexels/<id>.webp. Sizes are the stored WebP sizes. */
export const PEXELS: Record<string, { w: number; h: number }> = {
  "35206443": { w: 1920, h: 1280 }, "37538523": { w: 1440, h: 1920 }, "17492446": { w: 1920, h: 1280 },
  "37587575": { w: 1440, h: 1920 }, "35802018": { w: 1280, h: 1920 }, "37538525": { w: 1920, h: 1440 },
  "37096594": { w: 1920, h: 1440 }, "37096589": { w: 1920, h: 1440 }, "29762229": { w: 1920, h: 1280 },
  "30005517": { w: 1280, h: 1920 }, "30005513": { w: 1280, h: 1920 }, "29601661": { w: 1440, h: 1920 },
  "29601658": { w: 1440, h: 1920 }, "35802017": { w: 1280, h: 1920 }, "40922826": { w: 1280, h: 1920 },
  "35449705": { w: 1920, h: 1280 }, "36533362": { w: 1081, h: 1920 }, "5029303": { w: 1920, h: 1271 },
  "31177138": { w: 1440, h: 1920 }, "7835692": { w: 1920, h: 1280 },
};
export const pexels = (id: string): Photo => ({ src: mediaUrl(`photos/pexels/${id}.webp`), ...(PEXELS[id] ?? { w: 1920, h: 1280 }) });

const p = (key: string, w: number, h: number): Photo => ({ src: mediaUrl(`photos/${key}`), w, h });
export const activityMedia = {
  hero: p("outside-day/dji_20250428172115_0307_d.webp", 1920, 1080),
  ingredients: p("activities/cooking/ingredients-top.webp", 1600, 1200),
  bread: p("activities/cooking/bread.webp", 1200, 1600),
  tagine: p("activities/cooking/tagine-together.webp", 1200, 1600),
  tagineStove: p("activities/cooking/tagine.webp", 1200, 1600),
  breadShaping: p("activities/cooking/bread-shaping.webp", 1200, 1600),
  ingredientsWide: p("activities/cooking/ingredients.webp", 1600, 1200),
} as const;

type Fact = "duration" | "distance" | "highest" | "gain" | "difficulty" | "departure";

export type ActivitiesCopy = {
  meta: { title: string; description: string };
  hero: { label: string; title: string; lead: string; alt: string; jumpCooking: string; jumpOutings: string };
  perPerson: string;
  book: string;
  whatsappMessage: string; // {activity}
  cooking: {
    label: string;
    title: string;
    lead: string;
    duration: string;
    programmeTitle: string;
    programme: { time: string; title: string; text: string; points: string[] }[];
    end: string;
    intro: string[];
    includesTitle: string;
    includes: string;
    alts: { ingredients: string; bread: string; tagine: string };
  };
  outings: {
    label: string;
    title: string;
    lead: string;
    facts: Record<Fact, string>;
    highlights: string;
    levelLabel: string;
    items: Record<
      OutingId,
      {
        name: string;
        kind: string;
        summary: string;
        /** the owner's full description, one string per paragraph */
        body: string[];
        highlights: string[];
        facts: Partial<Record<Fact, string>>;
      }
    >;
  };
  detail: { back: string; description: string; details: string; others: string; from: string };
  info: { label: string; title: string; items: { title: string; text: string }[] };
  contact: { label: string; title: string; text: string; whatsapp: string; email: string };
};

const copy: Record<Locale, ActivitiesCopy> = { en, fr, es, de, ar };
export const activitiesCopy = (locale: string) => copy[locale as Locale] ?? en;
