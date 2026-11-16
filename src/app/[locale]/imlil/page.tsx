import Image from "next/image";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing, localePath } from "@/i18n/routing";
import { site } from "@/lib/site";
import { pexels } from "@/lib/activities";
import { GUIDE_PHOTOS, PLACE_ACTIVITY, guideCopy, type Place, type Season } from "@/lib/imlil-guide";
import { WhatsAppIcon } from "@/components/site/icons";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const g = guideCopy(locale);
  const hero = pexels(GUIDE_PHOTOS.hero);
  return {
    title: g.meta.title,
    description: g.meta.description,
    alternates: {
      canonical: localePath(locale, "/imlil"),
      languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, "/imlil")])),
    },
    openGraph: { images: [{ url: hero.src, width: hero.w, height: hero.h }] },
  };
}

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
const PLACES: Place[] = ["aroumd", "chamharouch", "tamatert", "mzik", "toubkal", "asni"];
const SECTIONS = ["village", "when", "getting", "around", "toubkal", "practical"] as const;

export default async function ImlilGuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const g = guideCopy(locale);
  const hero = pexels(GUIDE_PHOTOS.hero);
  const village = pexels(GUIDE_PHOTOS.village);
  const summit = pexels(GUIDE_PHOTOS.places.toubkal);
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(g.getting.whatsappMessage)}`;
  const tocLabel: Record<(typeof SECTIONS)[number], string> = {
    village: g.about.label,
    when: g.when.label,
    getting: g.getting.label,
    around: g.around.label,
    toubkal: g.toubkal.label,
    practical: g.practical.label,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: "Imlil",
    description: g.meta.description,
    url: `${site.url}${localePath(locale, "/imlil")}`,
    image: hero.src,
    geo: { "@type": "GeoCoordinates", latitude: 31.1355, longitude: -7.9192, elevation: 1740 },
    containedInPlace: { "@type": "Place", name: "Toubkal National Park, High Atlas, Morocco" },
    touristType: ["Hikers", "Mountaineers", "Families", "Nature lovers"],
  };

  return (
    <>
      {/* 1 · Hero */}
      <section className="container-site grid gap-8 pb-10 pt-8 md:pt-12 lg:grid-cols-12 lg:items-end lg:gap-10">
        <div className="grid gap-5 lg:col-span-6">
          <p className="label">{g.hero.label}</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl">{g.hero.title}</h1>
          <p className="max-w-[54ch] text-[17px] text-muted">{g.hero.lead}</p>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-card sm:aspect-[4/3] lg:col-span-6 lg:aspect-[4/5]">
          <Image src={hero.src} alt={g.hero.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>

      <section className="container-site pb-10">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-rule pt-8 lg:grid-cols-4">
          {g.facts.map((f) => (
            <div key={f.label} className="grid gap-1 border-t border-ink/80 pt-3">
              <dt className="order-2 text-sm text-muted">{f.label}</dt>
              <dd className="order-1 font-mono text-3xl tracking-tight lg:text-4xl" dir="ltr">{f.value}</dd>
            </div>
          ))}
        </dl>
        <nav aria-label={g.toc} className="mt-10 flex flex-wrap items-center gap-2">
          <span className="label me-2">{g.toc}</span>
          {SECTIONS.map((s) => (
            <a key={s} href={`#${s}`} className="rounded-full border border-rule px-4 py-1.5 text-sm hover:border-earth hover:text-earth">
              {tocLabel[s]}
            </a>
          ))}
        </nav>
      </section>

      {/* 2 · The village */}
      <section id="village" className="container-site grid scroll-mt-24 gap-10 border-t border-rule py-16 md:grid-cols-12 md:items-center lg:py-24">
        <div className="relative aspect-[4/5] overflow-hidden rounded-card md:col-span-5">
          <Image src={village.src} alt={g.about.alt} fill sizes="(min-width: 768px) 40vw, 100vw" className="reveal-clip object-cover" />
        </div>
        <div className="grid gap-5 md:col-span-7 lg:col-span-6 lg:col-start-7">
          <p className="label">{g.about.label}</p>
          <h2 className="text-4xl lg:text-5xl">{g.about.title}</h2>
          {g.about.paras.map((p) => (
            <p key={p.slice(0, 32)} className="text-[17px] leading-relaxed text-ink/85">{p}</p>
          ))}
        </div>
      </section>

      {/* 3 · When to go */}
      <section id="when" className="scroll-mt-24 bg-snow py-16 lg:py-24">
        <div className="container-site grid gap-10">
          <header className="grid gap-3 lg:grid-cols-2 lg:items-end lg:gap-10">
            <div className="grid gap-3">
              <p className="label">{g.when.label}</p>
              <h2 className="text-4xl lg:text-5xl">{g.when.title}</h2>
            </div>
            <div className="grid gap-2 lg:justify-self-end">
              <p className="max-w-lg text-muted">{g.when.lead}</p>
              <p className="w-fit rounded-full bg-earth/10 px-4 py-1.5 text-sm font-medium text-earth">{g.when.best}</p>
            </div>
          </header>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SEASONS.map((s) => {
              const ph = pexels(GUIDE_PHOTOS.seasons[s]);
              const x = g.when.seasons[s];
              return (
                <li key={s} className="grid content-start gap-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-card">
                    <Image src={ph.src} alt="" fill sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-2xl">{x.name}</h3>
                    <span className="meta text-granite">{x.months}</span>
                  </div>
                  <p className="text-sm text-muted">{x.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 4 · Getting here */}
      <section id="getting" className="container-site grid scroll-mt-24 gap-10 py-16 lg:grid-cols-12 lg:gap-10 lg:py-24">
        <div className="grid content-start gap-6 lg:col-span-6">
          <p className="label">{g.getting.label}</p>
          <h2 className="text-4xl lg:text-5xl">{g.getting.title}</h2>
          <ol className="grid border-s border-rule">
            {g.getting.steps.map((st, i) => (
              <li key={st.name} className="relative grid gap-0.5 pb-6 ps-6 last:pb-0">
                <span className={`absolute -start-[5px] top-2 h-[9px] w-[9px] rounded-full ${i === g.getting.steps.length - 1 ? "bg-earth" : "border border-ink bg-paper"}`} aria-hidden="true" />
                <span className="meta text-granite">{st.meta}</span>
                <span className="font-display text-2xl [html[dir=rtl]_&]:font-arabic-display [html[dir=rtl]_&]:text-xl">{st.name}</span>
                <span className="text-sm text-muted">{st.text}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid content-start gap-5 rounded-card bg-ink p-6 text-snow sm:p-10 lg:col-span-6">
          <p className="text-snow/80">{g.getting.note}</p>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary w-fit bg-snow text-ink hover:bg-ochre">
            <WhatsAppIcon className="h-4 w-4" />
            {g.getting.whatsapp}
          </a>
        </div>
      </section>

      {/* 5 · Around Imlil */}
      <section id="around" className="scroll-mt-24 border-t border-rule py-16 lg:py-24">
        <div className="container-site grid gap-10">
          <header className="grid gap-3 lg:grid-cols-2 lg:items-end lg:gap-10">
            <div className="grid gap-3">
              <p className="label">{g.around.label}</p>
              <h2 className="text-4xl lg:text-5xl">{g.around.title}</h2>
            </div>
            <p className="max-w-lg text-muted lg:justify-self-end">{g.around.lead}</p>
          </header>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {PLACES.map((p) => {
              const x = g.around.places[p];
              const photoId = p === "asni" ? null : GUIDE_PHOTOS.places[p];
              const act = PLACE_ACTIVITY[p];
              return (
                <li key={p} className="grid content-start gap-3">
                  {photoId ? (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-card">
                      <Image src={pexels(photoId).src} alt="" fill sizes="(min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                    </div>
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center rounded-card bg-walnut p-6 text-center">
                      <span className="font-display text-3xl text-ochre [html[dir=rtl]_&]:font-arabic-display">{x.name}</span>
                    </div>
                  )}
                  <span className="meta text-granite">{x.meta}</span>
                  <h3 className="text-2xl">{x.name}</h3>
                  <p className="text-sm text-muted">{x.text}</p>
                  {act && (
                    <Link href={`/activities/${act}`} className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-earth hover:underline">
                      {g.around.activity}
                      <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 6 · Toubkal */}
      <section id="toubkal" className="scroll-mt-24 bg-walnut py-16 text-snow lg:py-24">
        <div className="container-site grid gap-10 md:grid-cols-12 md:items-center">
          <div className="grid gap-5 md:col-span-7">
            <p className="label text-ochre">{g.toubkal.label}</p>
            <h2 className="text-4xl lg:text-5xl">{g.toubkal.title}</h2>
            {g.toubkal.paras.map((p) => (
              <p key={p.slice(0, 32)} className="text-snow/80">{p}</p>
            ))}
            <dl className="grid grid-cols-3 gap-4 border-t border-snow/20 pt-5">
              {g.toubkal.facts.map((f) => (
                <div key={f.label} className="grid gap-1">
                  <dt className="order-2 text-xs text-snow/60">{f.label}</dt>
                  <dd className="order-1 font-mono text-2xl tracking-tight text-ochre lg:text-3xl">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative aspect-[3/4] overflow-hidden rounded-card md:col-span-5">
            <Image src={summit.src} alt={g.around.places.toubkal.name} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* 7 · Practical tips */}
      <section id="practical" className="container-site grid scroll-mt-24 gap-8 py-16 lg:py-24">
        <div className="grid gap-3">
          <p className="label">{g.practical.label}</p>
          <h2 className="text-4xl lg:text-5xl">{g.practical.title}</h2>
        </div>
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {g.practical.items.map((x) => (
            <div key={x.title} className="grid gap-1 border-t border-ink/80 pt-3">
              <dt className="font-medium">{x.title}</dt>
              <dd className="text-sm text-muted">{x.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 8 · Stay with us */}
      <section className="container-site pb-20">
        <div className="grid gap-5 rounded-card bg-ink p-6 text-snow sm:p-10 lg:grid-cols-12 lg:items-center">
          <div className="grid gap-3 lg:col-span-8">
            <h2 className="text-4xl">{g.cta.title}</h2>
            <p className="max-w-2xl text-snow/70">{g.cta.text}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
            <Link href="/rooms" className="btn-primary bg-snow text-ink hover:bg-ochre">{g.cta.rooms}</Link>
            <Link href="/activities" className="btn-outline border-snow/60 text-snow hover:border-ochre hover:text-ochre">{g.cta.activities}</Link>
          </div>
        </div>
        <p className="meta mt-4 text-granite">{g.photoCredit}</p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
