import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import { setRequestLocale } from "next-intl/server";
import { routing, localePath } from "@/i18n/routing";
import { mediaUrl } from "@/lib/media";
import { getRooms } from "@/lib/rooms";
import { activityMedia } from "@/lib/activities";
import { pagesCopy } from "@/lib/pages";
import { GalleryGrid, type GalleryPhoto } from "@/components/site/GalleryGrid";

// room photos come from the admin; refresh hourly
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

/** House photos (Nov 2026 shoot, keys in R2) with their stored sizes */
const HOUSE: [string, string, number, number][] = [
  ["house", "outside-day/dji_20250428172039_0306_d.webp", 1920, 1080],
  ["house", "outside-day/dsc00473-modifier.webp", 1280, 1920],
  ["house", "inside/dsc00377.webp", 1280, 1920],
  ["house", "living-room/dsc00405.webp", 1920, 1280],
  ["house", "inside/dsc00368.webp", 1920, 1280],
  ["house", "outside-night/dji_20250429201942_0453_d-enhanced-nr-modifier.webp", 1920, 1080],
  ["house", "inside/dsc00391.webp", 1280, 1920],
  ["house", "living-room/dsc00428.webp", 1920, 1280],
  ["house", "inside/dsc00401.webp", 1920, 1280],
  ["house", "reception/dsc00413.webp", 1280, 1920],
  ["house", "inside/dsc00380.webp", 1920, 1280],
  ["house", "outside-day/dji_20250428172208_0311_d.webp", 1920, 1080],
  ["house", "living-room/dsc00432.webp", 1280, 1920],
  ["house", "outside-night/dji_20250429201732_0445_d-enhanced-nr-modifier.webp", 1920, 1080],
  ["bathrooms", "bathroom/dsc00350.webp", 1920, 1280],
  ["bathrooms", "bathroom/dsc00360.webp", 1280, 1920],
  ["bathrooms", "bathroom/dsc00356.webp", 1920, 1280],
  ["tea", "tea-man/dsc00458.webp", 1280, 1920],
  ["tea", "tea-man/dsc00470.webp", 1920, 1280],
  ["tea", "tea-man/dsc00462.webp", 1280, 1920],
  ["tea", "tea-man/dsc00452.webp", 1920, 1280],
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const g = pagesCopy(locale).gallery;
  return withSocial(locale, {
    title: g.meta.title,
    description: g.meta.description,
    alternates: { canonical: localePath(locale, "/gallery"), languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, "/gallery")])) },
  });
}

export default async function GalleryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const g = pagesCopy(locale).gallery;
  const rooms = await getRooms(locale);

  const house: GalleryPhoto[] = HOUSE.map(([cat, key, w, h]) => ({ cat, src: mediaUrl(`photos/${key}`), w, h, alt: `${g.categories[cat as "house"]} · Riad Berber Towers` }));
  const roomPhotos: GalleryPhoto[] = rooms.flatMap((r) =>
    [r.cover, ...r.images.filter((i) => i !== r.cover)].slice(0, 2).map((src) => ({ cat: "rooms", src, w: 3, h: 2, alt: r.name })),
  );
  const m = activityMedia;
  const kitchen: GalleryPhoto[] = [m.ingredients, m.bread, m.tagine, m.tagineStove].map((p) => ({ cat: "kitchen", ...p, alt: g.categories.kitchen }));

  // interleave so "All" mixes the house, rooms and details
  const photos = [...house.slice(0, 6), ...roomPhotos.slice(0, 4), ...house.slice(6, 14), ...roomPhotos.slice(4), ...house.slice(14), ...kitchen];

  return (
    <section className="container-site grid gap-8 pb-20 pt-8 md:pt-12">
      <div className="grid max-w-3xl gap-4">
        <p className="label">{g.label}</p>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl">{g.title}</h1>
        <p className="text-[17px] text-muted">{g.lead}</p>
      </div>
      <GalleryGrid photos={photos} labels={{ all: g.all, categories: g.categories, close: g.close, prev: g.prev, next: g.next, open: g.open }} />
    </section>
  );
}
