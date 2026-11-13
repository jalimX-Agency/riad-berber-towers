import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, localePath } from "@/i18n/routing";
import { getRooms } from "@/lib/rooms";
import { site } from "@/lib/site";
import { getAvailability, parseStayQuery } from "@/lib/booking/availability";
import { todayInImlil, toISO } from "@/lib/booking/dates";
import { SearchBar } from "@/components/booking/SearchBar";
import { RoomResults, type Availability, type Stay } from "@/components/booking/RoomResults";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
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

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function RoomsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("rooms");
  const ts = await getTranslations("search");

  const rooms = await getRooms(locale);
  const hasDates = Boolean(one(sp.checkIn) || one(sp.checkOut));
  const { query, error } = parseStayQuery({ checkIn: one(sp.checkIn), checkOut: one(sp.checkOut), adults: one(sp.adults) });

  let availability: Record<string, Availability> | null = null;
  let stay: Stay | null = null;
  if (query) {
    const map = await getAvailability(query);
    availability = Object.fromEntries([...map].map(([id, a]) => [id, { available: a.available, reason: a.reason, minNights: a.minNights, total: a.total, perNight: a.perNight }]));
    stay = { checkIn: toISO(query.checkIn), checkOut: toISO(query.checkOut), nights: query.nights, adults: query.adults };
  }

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
      <section className="container-site grid gap-6 pb-6 pt-8 md:pt-12">
        <div className="grid gap-2">
          <p className="label">{t("eyebrow")}</p>
          <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
          <p className="max-w-[70ch] text-muted">{t("intro")}</p>
        </div>
        <div id="search" className="scroll-mt-28">
          <SearchBar
            key={`${stay?.checkIn ?? ""}-${stay?.checkOut ?? ""}-${stay?.adults ?? ""}`}
            checkIn={stay?.checkIn ?? one(sp.checkIn)}
            checkOut={stay?.checkOut ?? one(sp.checkOut)}
            adults={stay?.adults ?? 2}
            today={toISO(todayInImlil())}
            hasQuery={Boolean(stay)}
          />
          {hasDates && error && error !== "missing" && (
            <p role="alert" className="mt-2 text-sm text-earth">
              {ts(`errors.${error}`)}
            </p>
          )}
        </div>
      </section>

      <section className="container-site pb-24 pt-2">
        <RoomResults rooms={rooms} availability={availability} stay={stay} />
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    </>
  );
}
