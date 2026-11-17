import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { site } from "@/lib/site";

const OG_LOCALE: Record<string, string> = { en: "en_GB", fr: "fr_FR", es: "es_ES", de: "de_DE", ar: "ar_MA" };
const DEFAULT_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: site.name };

type Img = { url: string | URL; width?: number; height?: number; alt?: string };

/**
 * Completes a page's metadata for search and sharing. In Next.js a page's `openGraph` replaces the
 * layout's whole object, so every page sends it complete here: title, description, URL, image,
 * og:locale and its alternates, the Twitter card, and an x-default next to the hreflang links.
 */
export function withSocial(locale: string, m: Metadata): Metadata {
  const title = typeof m.title === "string" ? m.title : undefined;
  const description = m.description ?? undefined;
  const canonical = (m.alternates?.canonical ?? undefined) as string | undefined;
  const raw = m.openGraph?.images;
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Img[];
  const images = (list.length ? list : [DEFAULT_IMAGE]).map((i) => ({ alt: title ?? site.name, ...i }));
  const languages = m.alternates?.languages as Record<string, string> | undefined;

  return {
    ...m,
    alternates: { ...m.alternates, ...(languages ? { languages: { ...languages, "x-default": languages[routing.defaultLocale] } } : {}) },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: OG_LOCALE[locale] ?? "en_GB",
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      title: title ? `${title} · ${site.name}` : undefined,
      description,
      url: canonical,
      ...m.openGraph,
      images,
    },
    twitter: { card: "summary_large_image", title: title ? `${title} · ${site.name}` : undefined, description, images: images.map((i) => String(i.url)) },
  };
}
