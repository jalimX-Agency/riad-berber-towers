import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing, localePath } from "@/i18n/routing";
import { getRoom, getRooms, getRoomSlugs, formatPrice } from "@/lib/rooms";
import { site } from "@/lib/site";
import { RoomGallery } from "@/components/rooms/RoomGallery";
import { AmenityIcon } from "@/components/rooms/AmenityIcon";
import { WhatsAppIcon } from "@/components/site/icons";
import { BookingBox } from "@/components/booking/BookingBox";
import { todayInImlil, toISO } from "@/lib/booking/dates";

export const revalidate = 3600;

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const slugs = await getRoomSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const room = await getRoom(locale, slug);
  if (!room) return {};
  const path = `/rooms/${slug}`;
  return withSocial(locale, {
    title: room.name,
    description: room.description || room.tagline,
    alternates: {
      canonical: localePath(locale, path),
      languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, path)])),
    },
    openGraph: { title: room.name, description: room.tagline, images: room.cover ? [{ url: room.cover }] : undefined },
  });
}

export default async function RoomPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [room, all] = await Promise.all([getRoom(locale, slug), getRooms(locale)]);
  if (!room) notFound();
  const t = await getTranslations("rooms");
  const nav = await getTranslations("nav");

  const price = formatPrice(room.price, room.currency, locale);
  const whatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(t("whatsappMessage", { room: room.name }))}`;
  const idx = all.findIndex((r) => r.slug === slug);
  const others = [1, 2, 3].map((k) => all[(idx + k) % all.length]).filter((r) => r.slug !== slug);
  const url = `${site.url}${localePath(locale, `/rooms/${slug}`)}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "HotelRoom",
      name: room.name,
      description: room.description,
      url,
      image: room.images.map((src) => (src.startsWith("http") ? src : `${site.url}${src}`)),
      occupancy: { "@type": "QuantitativeValue", maxValue: room.maxAdults },
      amenityFeature: room.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: t(`amenities.${a}`), value: true })),
      containedInPlace: { "@type": "BedAndBreakfast", name: site.name, url: site.url },
      offers: {
        "@type": "Offer",
        price: room.price,
        priceCurrency: room.currency,
        unitText: "night",
        description: t("breakfast"),
        url,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.name, item: `${site.url}${localePath(locale)}` },
        { "@type": "ListItem", position: 2, name: nav("rooms"), item: `${site.url}${localePath(locale, "/rooms")}` },
        { "@type": "ListItem", position: 3, name: room.name, item: url },
      ],
    },
  ];

  return (
    <>
      <div className="container-site pt-6">
        <nav aria-label="Breadcrumb" className="meta flex items-center gap-2 text-muted">
          <Link href="/rooms" className="hover:text-earth">{nav("rooms")}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-ink">{room.name}</span>
        </nav>
      </div>

      <header className="container-site grid gap-4 pb-8 pt-8 md:grid-cols-12 md:items-end">
        <div className="grid gap-3 md:col-span-8">
          <p className="meta text-granite">
            {String(room.order).padStart(2, "0")} · {t(`category.${room.category}`)} · {t(`floor.${room.floor}`)}
          </p>
          <h1 className="text-5xl sm:text-7xl">{room.name}</h1>
          <p className="font-display text-2xl italic text-muted [html[dir=rtl]_&]:font-[family-name:var(--font-arabic)] [html[dir=rtl]_&]:not-italic">
            {room.tagline}
          </p>
        </div>
      </header>

      <section className="container-site">
        <RoomGallery images={room.images} name={room.name} />
      </section>

      <section className="container-site grid gap-12 py-14 lg:grid-cols-12">
        <div className="grid content-start gap-10 lg:col-span-7">
          <p className="max-w-[60ch] text-lg leading-relaxed">{room.description}</p>

          <div className="grid gap-4">
            <h2 className="text-3xl">{t("facts")}</h2>
            <dl className="grid border-t border-ink sm:grid-cols-2 sm:gap-x-10">
              {[
                { k: t(`category.${room.category}`), v: t(`floor.${room.floor}`) },
                { k: t(`view.${room.view}`), v: t("guests", { count: room.maxAdults }) },
                { k: t("breakfast"), v: "✓" },
                { k: t("perNight"), v: price },
              ].map((row) => (
                <div key={row.k} className="flex items-baseline justify-between gap-4 border-b border-rule py-3">
                  <dt>{row.k}</dt>
                  <dd className="meta text-base" dir="auto">{row.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-4">
            <h2 className="text-3xl">{t("amenitiesTitle")}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {room.amenities.map((a) => (
                <li key={a} className="flex items-center gap-3 rounded-[6px] border border-rule bg-snow px-4 py-3">
                  <AmenityIcon name={a} className="h-5 w-5 text-earth" />
                  {t(`amenities.${a}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Booking card: live price for the chosen dates, then checkout */}
        <aside id="book" className="scroll-mt-28 lg:col-span-4 lg:col-start-9">
          <div className="grid gap-5 rounded-[10px] border border-rule bg-snow p-5 lg:sticky lg:top-28">
            <BookingBox slug={room.slug} basePrice={room.price} currency={room.currency} maxAdults={room.maxAdults} today={toISO(todayInImlil())} />
            <p className="label">{t("breakfast")}</p>
            <div className="grid gap-2 border-t border-rule pt-4 text-sm">
              <span className="text-muted">{t("bookEmail")}</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-earth hover:underline">
                  <WhatsAppIcon className="h-4 w-4" />
                  WhatsApp
                </a>
                <a href={`mailto:${site.email}?subject=${encodeURIComponent(room.name)}`} className="inline-flex items-center gap-1.5 text-earth hover:underline">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email
                </a>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="border-t border-rule bg-snow">
        <div className="container-site grid gap-8 py-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-4xl">{t("others")}</h2>
            <Link href="/rooms" className="nav-link text-ink hover:text-earth">{nav("rooms")}</Link>
          </div>
          <ul className="grid gap-8 md:grid-cols-3">
            {others.map((r) => (
              <li key={r.slug}>
                <Link href={`/rooms/${r.slug}`} className="group grid gap-3">
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-[4px] bg-walnut">
                    {r.cover && (
                      <Image src={r.cover} alt={r.name} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                    )}
                  </span>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-2xl group-hover:text-earth [html[dir=rtl]_&]:font-[family-name:var(--font-arabic-display)]">{r.name}</span>
                    <span className="meta" dir="ltr">{formatPrice(r.price, r.currency, locale)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                    {t(`floor.${r.floor}`)} · {t(`view.${r.view}`)}
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
