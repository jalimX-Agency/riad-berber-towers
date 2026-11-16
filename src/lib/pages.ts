import type { Locale } from "@/i18n/routing";
import en from "@/content/pages/en";
import fr from "@/content/pages/fr";
import es from "@/content/pages/es";
import de from "@/content/pages/de";
import ar from "@/content/pages/ar";

type Meta = { title: string; description: string };

/** Copy for the story, contact, gallery and legal pages. {deposit} {currencies} {max} {percent} are filled in by the page. */
export type PagesCopy = {
  story: {
    meta: Meta;
    label: string;
    /** headline in two parts, a small photo sits between them */
    title: [string, string];
    lead: string;
    facts: string[];
    day: { label: string; title: string; hours: { time: string; title: string; text: string; alt: string }[] };
    touch: { label: string; title: string; materials: { name: string; text: string }[] };
    word: { label: string; word: string; text: string };
    end: { title: string; text: string; rooms: string; contact: string };
  };
  contact: {
    meta: Meta;
    label: string;
    title: string;
    lead: string;
    whatsapp: { title: string; text: string; button: string; message: string };
    phone: string;
    email: { title: string; text: string };
    address: { title: string; lines: string[]; map: string };
    find: { title: string; text: string };
    faq: { title: string; items: { q: string; a: string }[] };
  };
  gallery: {
    meta: Meta;
    label: string;
    title: string;
    lead: string;
    all: string;
    categories: Record<"house" | "rooms" | "bathrooms" | "tea" | "kitchen", string>;
    close: string;
    prev: string;
    next: string;
    open: string;
  };
  legal: {
    updated: string;
    terms: { meta: Meta; title: string; intro: string; sections: { title: string; paras: string[] }[] };
    privacy: { meta: Meta; title: string; intro: string; sections: { title: string; paras: string[] }[] };
  };
};

const copy: Record<Locale, PagesCopy> = { en, fr, es, de, ar };
export const pagesCopy = (locale: string) => copy[locale as Locale] ?? en;

/** Fill {key} placeholders */
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
