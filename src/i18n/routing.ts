import { defineRouting } from "next-intl/routing";

export const locales = ["en", "fr", "es", "ar"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

export const rtlLocales: Locale[] = ["ar"];
export const isRtl = (locale: string) => rtlLocales.includes(locale as Locale);
