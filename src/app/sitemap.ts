import type { MetadataRoute } from "next";
import { routing, localePath } from "@/i18n/routing";
import { site } from "@/lib/site";
import { getRooms } from "@/lib/rooms";
import { ACTIVITY_SLUGS } from "@/lib/activities";

// rooms come from the admin: refresh daily
export const revalidate = 86400;

type Entry = { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"]; image?: string };

/** Every public page in every language, each with its hreflang alternates. Booking steps and drafts stay out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rooms = await getRooms(routing.defaultLocale).catch(() => []);
  const pages: Entry[] = [
    { path: "/", priority: 1, freq: "weekly" },
    { path: "/rooms", priority: 0.9, freq: "weekly" },
    ...rooms.map((r) => ({ path: `/rooms/${r.slug}`, priority: 0.8, freq: "monthly" as const, image: r.cover })),
    { path: "/activities", priority: 0.8, freq: "monthly" },
    ...ACTIVITY_SLUGS.map((s) => ({ path: `/activities/${s}`, priority: 0.7, freq: "monthly" as const })),
    { path: "/restaurant", priority: 0.7, freq: "monthly" },
    { path: "/imlil", priority: 0.8, freq: "monthly" },
    { path: "/story", priority: 0.6, freq: "yearly" },
    { path: "/gallery", priority: 0.6, freq: "monthly" },
    { path: "/contact", priority: 0.6, freq: "yearly" },
    { path: "/terms", priority: 0.2, freq: "yearly" },
    { path: "/privacy", priority: 0.2, freq: "yearly" },
  ];
  const now = new Date();
  return pages.flatMap((p) =>
    routing.locales.map((l) => ({
      url: `${site.url}${localePath(l, p.path)}`,
      lastModified: now,
      changeFrequency: p.freq,
      priority: p.priority,
      alternates: {
        languages: { ...Object.fromEntries(routing.locales.map((x) => [x, `${site.url}${localePath(x, p.path)}`])), "x-default": `${site.url}${localePath(routing.defaultLocale, p.path)}` },
      },
      ...(p.image ? { images: [p.image] } : {}),
    })),
  );
}
