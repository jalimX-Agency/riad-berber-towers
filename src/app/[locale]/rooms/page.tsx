import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, localePath } from "@/i18n/routing";
import { getRooms, formatPrice } from "@/lib/rooms";
import { site } from "@/lib/site";
import { RoomsBrowser } from "@/components/rooms/RoomsBrowser";

export const revalidate = 3600;

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rooms" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: localePath(locale, "/rooms"),
      languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, "/rooms")])),
    },
  };
}

export default async function RoomsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rooms");
  const rooms = await getRooms(locale);

  const prices = rooms.map((r) => r.price);
  const currency = rooms[0]?.currency ?? "EUR";
  const byFloor = [0, 1, 2].map((f) => ({ floor: f, count: rooms.filter((r) => r.floor === f).length }));

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: rooms.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${site.url}${localePath(locale, `/rooms/${r.slug}`)}`,
      name: r.name,
    })),
  };

  return (
    <>
      <section className="container-site grid gap-10 pb-12 pt-10 md:grid-cols-12 md:pt-16">
        <div className="grid content-start gap-5 md:col-span-7">
          <p className="label">{t("eyebrow")}</p>
          <h1 className="text-5xl sm:text-7xl">{t("title")}</h1>
          <p className="max-w-[58ch] text-lg text-muted">{t("intro")}</p>
        </div>

        {/* House index: floors, room counts and price range, in the meta voice */}
        <dl className="grid content-end gap-0 self-end border-t border-ink md:col-span-4 md:col-start-9">
          {byFloor.map(({ floor, count }) => (
            <div key={floor} className="flex items-baseline justify-between border-b border-rule py-3">
              <dt className="text-sm">{t(`floor.${floor}`)}</dt>
              <dd className="meta text-base">{String(count).padStart(2, "0")}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between py-3">
            <dt className="text-sm first-letter:uppercase">{t("perNight")}</dt>
            <dd className="meta text-base" dir="ltr">
              {formatPrice(Math.min(...prices), currency, locale)}–{formatPrice(Math.max(...prices), currency, locale)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="container-site pb-24">
        <RoomsBrowser rooms={rooms} />
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    </>
  );
}
