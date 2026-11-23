import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { isRtl } from "@/i18n/routing";
import { getRooms, formatPrice } from "@/lib/rooms";
import { site } from "@/lib/site";
import { homeMedia } from "@/lib/home-media";
import { todayInImlil, toISO } from "@/lib/booking/dates";
import { SearchBar } from "@/components/booking/SearchBar";
import { HouseClimb, type ClimbStage } from "@/components/home/HouseClimb";
import { HouseStrip, type StripItem } from "@/components/home/HouseStrip";
import { HomeHero } from "@/components/home/HomeHero";

// prices change from the admin (which revalidates "/"); the date picker's "today" refreshes hourly
// refreshed once a day (free Vercel/Neon plans); saving prices or rooms in the admin refreshes at once
export const revalidate = 86400;

const STAGES = [
  { id: "ground", num: "00", floor: 0 },
  { id: "first", num: "01", floor: 1 },
  { id: "second", num: "02", floor: 2 },
  { id: "roof", num: "03", floor: null },
] as const;

const STRIP = ["salon", "gallery", "skylight", "stairs", "fountain"] as const;

type PageProps = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tr = await getTranslations("rooms");
  const rooms = await getRooms(locale);
  const today = toISO(todayInImlil());
  const rtl = isRtl(locale);

  const stages: ClimbStage[] = STAGES.map((s) => ({
    id: s.id,
    num: s.num,
    label: t(`climb.stages.${s.id}.label`),
    title: t(`climb.stages.${s.id}.title`),
    text: t(`climb.stages.${s.id}.text`),
    photo: homeMedia.climb[s.id],
    rooms: rooms
      .filter((r) => r.floor === s.floor)
      .map((r) => ({
        slug: r.slug,
        name: r.name,
        view: tr(`view.${r.view}` as "view.mountain"),
        price: formatPrice(r.price, r.currency, locale),
        cover: r.cover,
      })),
  }));

  const strip: StripItem[] = STRIP.map((id) => ({
    id,
    title: t(`strip.items.${id}.title`),
    text: t(`strip.items.${id}.text`),
    photo: homeMedia.strip[id],
  }));

  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(t("arrive.whatsappMessage"))}`;
  const minPrice = Math.min(...rooms.map((r) => r.price));
  const currency = rooms[0]?.currency ?? "EUR";
  const heroCopy = {
    line1: t("hero.line1"),
    line2: t("hero.line2"),
    line3: t("hero.line3"),
    lead: t("hero.lead"),
    alt: t("hero.alt"),
    caption: t("hero.caption"),
    searchLabel: t("hero.searchLabel"),
    fromPrice: t("hero.fromPrice", { price: formatPrice(minPrice, currency, locale) }),
  };

  return (
    <>
      {/* 1 · Hero: the house from morning to night, a short silent loop over the photo */}
      <HomeHero copy={heroCopy} today={today} />

      {/* 2 · The house in numbers */}
      <section className="container-site grid gap-10 border-t border-rule py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20 lg:py-24">
        <div className="grid content-start gap-5">
          <p className="label">{t("intro.label")}</p>
          <p className="font-display text-[1.75rem] leading-[1.25] lg:text-[2.6rem] [html[dir=rtl]_&]:font-arabic [html[dir=rtl]_&]:text-2xl [html[dir=rtl]_&]:leading-[1.8] lg:[html[dir=rtl]_&]:text-3xl">
            {t("intro.text")}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 self-end">
          {(["altitude", "marrakech", "toubkal", "rooms"] as const).map((k) => (
            <div key={k} className="grid gap-1 border-t border-ink/80 pt-3">
              <dt className="order-2 text-sm text-muted">{t(`intro.facts.${k}.label`)}</dt>
              <dd className="order-1 font-mono text-3xl tracking-tight text-ink lg:text-4xl" dir="ltr">
                {t(`intro.facts.${k}.value`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 3 · Climb the house (signature 1) */}
      <section aria-labelledby="climb-title" className="bg-snow pt-16 lg:bg-ink lg:pt-0">
        <header className="container-site grid gap-3 pb-10 lg:hidden">
          <p className="label">{t("climb.label")}</p>
          <h2 id="climb-title" className="text-4xl">{t("climb.title")}</h2>
          <p className="max-w-prose text-muted">{t("climb.text")}</p>
        </header>
        <h2 className="sr-only hidden lg:block">{t("climb.title")}</h2>
        <HouseClimb stages={stages} fromLabel={tr("from")} perNight={tr("perNight")} />
        <div className="container-site py-12 lg:hidden">
          <Link href="/rooms" className="btn-primary w-full justify-center sm:w-auto">
            {t("climb.all")}
          </Link>
        </div>
      </section>

      {/* 4 · The welcome */}
      <section className="container-site grid gap-10 py-16 md:grid-cols-12 md:items-center md:gap-8 lg:py-28">
        <div className="relative md:col-span-6 lg:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden rounded-card md:aspect-[2/3]">
            <Image src={homeMedia.teaPortrait.src} alt={t("tea.alt1")} fill sizes="(min-width: 768px) 45vw, 100vw" className="reveal-clip object-cover" />
          </div>
          <div className="absolute -bottom-8 end-[-8px] w-[48%] overflow-hidden rounded-card border-4 border-paper md:-end-16 md:w-[55%]">
            <div className="relative aspect-[3/2]">
              <Image src={homeMedia.teaDetail.src} alt={t("tea.alt2")} fill sizes="(min-width: 768px) 25vw, 48vw" className="object-cover" />
            </div>
          </div>
        </div>
        <div className="grid gap-5 pt-6 md:col-span-6 md:col-start-7 md:pt-0 lg:col-span-5 lg:col-start-8">
          <p className="label">{t("tea.label")}</p>
          <h2 className="text-4xl lg:text-6xl">{t("tea.title")}</h2>
          <p className="text-[17px] text-muted">{t("tea.text1")}</p>
          <p className="text-muted">{t("tea.text2")}</p>
          <ul className="meta mt-2 grid gap-2 border-t border-rule pt-4 text-ink">
            {(["breakfast", "heating", "wifi"] as const).map((k) => (
              <li key={k} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-earth" aria-hidden="true" />
                {t(`tea.included.${k}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5 · Inside the house (signature 2) */}
      <section aria-labelledby="strip-title" className="overflow-x-clip bg-walnut pt-16 pb-14 text-snow lg:pb-0">
        <header className="container-site grid gap-3 pb-8 lg:grid-cols-2 lg:items-end lg:pb-0">
          <div className="grid gap-3">
            <p className="label text-ochre">{t("strip.label")}</p>
            <h2 id="strip-title" className="text-4xl lg:text-6xl">{t("strip.title")}</h2>
          </div>
          <p className="max-w-md text-snow/70 lg:justify-self-end">{t("strip.text")}</p>
        </header>
        <HouseStrip items={strip} rtl={rtl} />
      </section>

      {/* 6 · Imlil and the mountain */}
      <section className="relative">
        <div className="relative h-[56svh] min-h-[360px] lg:h-[86svh]">
          <Image src={homeMedia.valley.src} alt={t("imlil.alt")} fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          <p className="meta container-site absolute inset-x-0 bottom-5 text-snow/85">{t("imlil.caption")}</p>
        </div>
        <div className="container-site relative -mt-10 lg:-mt-40">
          <div className="grid gap-5 rounded-card bg-paper p-6 shadow-[0_24px_60px_-30px_rgba(47,32,22,0.5)] sm:p-10 lg:ms-auto lg:max-w-xl">
            <p className="label">{t("imlil.label")}</p>
            <h2 className="text-4xl lg:text-5xl">{t("imlil.title")}</h2>
            <p className="text-muted">{t("imlil.text")}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/activities" className="btn-primary">
                {t("imlil.activities")}
              </Link>
              <Link href="/imlil" className="btn-outline">
                {t("imlil.guide")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7 · Getting here + book */}
      <section className="container-site grid gap-12 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div className="grid content-start gap-6">
          <p className="label">{t("arrive.label")}</p>
          <h2 className="text-4xl lg:text-5xl">{t("arrive.title")}</h2>
          <ol className="grid border-s border-rule">
            {(["marrakech", "asni", "imlil"] as const).map((k, i) => (
              <li key={k} className="relative grid gap-0.5 ps-6 pb-6 last:pb-0">
                <span className={`absolute -start-[5px] top-2 h-[9px] w-[9px] rounded-full ${i === 2 ? "bg-earth" : "border border-ink bg-paper"}`} aria-hidden="true" />
                <span className="meta text-granite">{t(`arrive.steps.${k}.meta`)}</span>
                <span className="font-display text-2xl [html[dir=rtl]_&]:font-arabic-display [html[dir=rtl]_&]:text-xl">{t(`arrive.steps.${k}.name`)}</span>
                <span className="text-sm text-muted">{t(`arrive.steps.${k}.text`)}</span>
              </li>
            ))}
          </ol>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline w-fit">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {t("arrive.whatsapp")}
          </a>
        </div>

        <div className="grid content-start gap-5 rounded-card bg-ink p-4 py-8 text-snow sm:p-10">
          <p className="label text-ochre">{t("book.label")}</p>
          <h2 className="text-4xl">{t("book.title")}</h2>
          <p className="text-snow/70">{t("book.text")}</p>
          <SearchBar today={today} target="/rooms" idPrefix="end-" layout="stacked" className="text-ink [&_[role=alert]]:text-ochre" />
          <Link href="/rooms" className="inline-flex w-fit items-center gap-2 text-sm text-snow/80 hover:text-ochre">
            {t("climb.all")}
            <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
