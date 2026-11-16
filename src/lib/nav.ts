// Primary navigation. Labels come from messages "nav.<key>".
export const primaryNav = [
  { key: "rooms", href: "/rooms" },
  { key: "activities", href: "/activities" },
  { key: "imlil", href: "/imlil" },
  { key: "story", href: "/story" },
  { key: "contact", href: "/contact" },
] as const;

export const footerNav = [
  { key: "rooms", href: "/rooms", ns: "nav" },
  { key: "activities", href: "/activities", ns: "nav" },
  { key: "imlil", href: "/imlil", ns: "nav" },
  { key: "gallery", href: "/gallery", ns: "footer" },
  { key: "story", href: "/story", ns: "nav" },
  { key: "contact", href: "/contact", ns: "nav" },
] as const;

export const localeNames: Record<string, string> = { en: "English", fr: "Français", es: "Español", de: "Deutsch", ar: "العربية" };
