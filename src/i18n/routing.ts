import { defineRouting } from "next-intl/routing";

export const locales = ["en", "fr", "es", "de", "ar"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  // English lives at the root (/rooms); other languages are prefixed (/fr/rooms, /ar/rooms)
  localePrefix: "as-needed",
  // Always serve English at / instead of redirecting by browser language
  localeDetection: false,
});

export const rtlLocales: Locale[] = ["ar"];
export const isRtl = (locale: string) => rtlLocales.includes(locale as Locale);

/** Public path for a locale, e.g. localePath("fr", "/rooms") -> "/fr/rooms", localePath("en", "/") -> "/" */
export function localePath(locale: string, path = "/") {
  const clean = path === "/" ? "" : path;
  return locale === routing.defaultLocale ? clean || "/" : `/${locale}${clean}`;
}
