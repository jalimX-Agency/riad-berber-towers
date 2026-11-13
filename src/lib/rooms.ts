import { cache } from "react";
import type { Locale } from "@prisma/client";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media";

export type RoomView = {
  id: string;
  slug: string;
  code: string;
  order: number;
  category: string;
  floor: number;
  view: string;
  price: number;
  currency: string;
  maxAdults: number;
  amenities: string[];
  name: string;
  tagline: string;
  description: string;
  cover: string;
  images: string[];
};

type DbRoom = Awaited<ReturnType<typeof loadRooms>>[number];

const loadRooms = () =>
  db.room.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: { translations: true },
  });

function toView(r: DbRoom, locale: string): RoomView {
  const t = r.translations.find((x) => x.locale === locale) ?? r.translations.find((x) => x.locale === "en");
  return {
    id: r.id,
    slug: r.slug,
    code: r.code,
    order: r.order,
    category: r.category,
    floor: r.floor,
    view: r.view,
    price: Number(r.basePrice),
    currency: r.currency,
    maxAdults: r.maxAdults,
    amenities: r.amenities,
    name: t?.name || r.name,
    tagline: t?.tagline ?? "",
    description: t?.description ?? "",
    cover: mediaUrl(r.coverImage || r.images[0]),
    images: r.images.map(mediaUrl),
  };
}

/** All active rooms in the owner's order, with copy in `locale` (falls back to English). */
export const getRooms = cache(async (locale: string) => (await loadRooms()).map((r) => toView(r, locale)));

export const getRoom = cache(async (locale: string, slug: string) =>
  (await getRooms(locale)).find((r) => r.slug === slug) ?? null,
);

export const getRoomSlugs = async () =>
  (await db.room.findMany({ where: { active: true }, select: { slug: true } })).map((r) => r.slug);

export type { Locale };

/** Price like "€82". Arabic uses the English pattern: Arabic currency formats add bidi marks that scramble ranges. */
export function formatPrice(amount: number, currency: string, locale: string) {
  const intl = locale === "ar" ? "en" : locale;
  return new Intl.NumberFormat(intl, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
