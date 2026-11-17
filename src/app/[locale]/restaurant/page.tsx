import Image from "next/image";
import { withSocial } from "@/lib/seo";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, localePath } from "@/i18n/routing";
import { site } from "@/lib/site";
import { formatPrice } from "@/lib/rooms";
import { DINNER_PRICE, DRINKS, SERVICE, restaurantCopy, restaurantMedia } from "@/lib/restaurant";
import { WhatsAppIcon } from "@/components/site/icons";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const c = restaurantCopy(locale);
  const m = restaurantMedia.tagines;
  return withSocial(locale, {
    title: c.meta.title,
    description: c.meta.description,
    alternates: { canonical: localePath(locale, "/restaurant"), languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, "/restaurant")])) },
    openGraph: { images: [{ url: m.src, width: m.w, height: m.h }] },
  });
}

const ROMAN = ["I", "II", "III"];
/** position of a time on the 08:00 → 23:00 ruler, in % */
const at = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return ((h + m / 60 - 8) / 15) * 100;
};

/** small centred ornament between menu sections */
function Rule() {
  return (
    <div className="flex items-center justify-center gap-2 py-1 text-earth" aria-hidden="true">
      <span className="h-px w-10 bg-earth/40" />
      <span className="h-1 w-1 rotate-45 bg-earth" />
      <span className="h-1.5 w-1.5 rotate-45 border border-earth" />
      <span className="h-1 w-1 rotate-45 bg-earth" />
      <span className="h-px w-10 bg-earth/40" />
    </div>
  );
}

export default async function RestaurantPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = restaurantCopy(locale);
  const m = restaurantMedia;
  const eur = (n: number) => formatPrice(n, "EUR", locale);
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(c.cta.message)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: `${site.name} · ${c.label}`,
    servesCuisine: ["Moroccan", "Berber"],
    url: `${site.url}${localePath(locale, "/restaurant")}`,
    image: [m.tagines.src, m.couscous.src],
    telephone: site.phones[0],
    priceRange: eur(DINNER_PRICE),
    address: { "@type": "PostalAddress", streetAddress: site.address.street, addressLocality: site.address.locality, addressRegion: site.address.region, addressCountry: site.address.country },
    openingHoursSpecification: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: SERVICE.dinnerFrom, closes: SERVICE.dinnerTo },
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: [
        { "@type": "MenuSection", name: c.starters.title, hasMenuItem: c.starters.options.map((o) => ({ "@type": "MenuItem", name: o.join(" + ") })) },
        { "@type": "MenuSection", name: c.mains.title, hasMenuItem: c.mains.items.map((name) => ({ "@type": "MenuItem", name })) },
      ],
    },
  };

  return (
    <>
      {/* 1 · Title, price and the table from above */}
      <section className="container-site grid gap-8 pb-14 pt-8 md:pt-12 lg:grid-cols-12 lg:items-end lg:gap-10">
        <div className="grid gap-5 lg:col-span-5">
          <p className="label">{c.label}</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl">{c.title}</h1>
          <p className="max-w-[48ch] text-[17px] text-muted">{c.lead}</p>
          <div className="flex items-end gap-4 border-t border-ink/80 pt-5">
            <span className="font-mono text-6xl leading-none tracking-tighter text-earth" dir="ltr">{eur(DINNER_PRICE)}</span>
            <span className="grid pb-1 text-sm">
              <span className="font-medium">{c.price.per}</span>
              <span className="text-muted">{c.price.what}</span>
            </span>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-card lg:col-span-7">
          <Image src={m.tagines.src} alt={c.alts.tagines} fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
        </div>
      </section>

      {/* 2 · The menu card, laid on the table between two photos */}
      <section aria-labelledby="menu-title" className="relative overflow-hidden bg-walnut py-16 lg:py-24">
        <div className="pointer-events-none absolute -start-16 top-16 hidden w-[24vw] max-w-[340px] -rotate-6 overflow-hidden rounded-[6px] shadow-2xl xl:block">
          <div className="relative aspect-[3/4]">
            <Image src={m.couscous.src} alt={c.alts.couscous} fill sizes="24vw" className="object-cover" />
          </div>
        </div>
        <div className="pointer-events-none absolute -end-12 bottom-16 hidden w-[22vw] max-w-[320px] rotate-[5deg] overflow-hidden rounded-[6px] shadow-2xl xl:block">
          <div className="relative aspect-[3/4]">
            <Image src={m.serving.src} alt={c.alts.serving} fill sizes="22vw" className="object-cover" />
          </div>
        </div>

        <div className="container-site relative">
          <article className="mx-auto max-w-2xl bg-paper p-2 text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] lg:-rotate-[0.6deg]">
            <div className="grid gap-8 border border-earth/40 p-6 outline outline-1 outline-offset-[-7px] outline-earth/30 sm:p-12">
              <header className="grid justify-items-center gap-2 text-center">
                <h2 id="menu-title" className="font-display text-5xl italic sm:text-6xl [html[dir=rtl]_&]:not-italic">{c.card.title}</h2>
                <p className="label text-earth">{c.card.subtitle}</p>
              </header>

              <Rule />

              <section className="grid gap-4 text-center">
                <div>
                  <h3 className="text-3xl">{c.starters.title}</h3>
                  <p className="text-sm italic text-muted">{c.starters.note}</p>
                </div>
                <ol className="grid gap-5 sm:grid-cols-3 sm:gap-4">
                  {c.starters.options.map((o, i) => (
                    <li key={i} className="grid content-start gap-1">
                      <span className="font-display text-xl text-earth" dir="ltr">{ROMAN[i]}</span>
                      {o.map((dish) => (
                        <span key={dish} className="text-[15px] leading-snug">{dish}</span>
                      ))}
                    </li>
                  ))}
                </ol>
              </section>

              <Rule />

              <section className="grid gap-4 text-center">
                <div>
                  <h3 className="text-3xl">{c.mains.title}</h3>
                  <p className="text-sm italic text-muted">{c.mains.note}</p>
                </div>
                <ul className="grid gap-2">
                  {c.mains.items.map((dish) => (
                    <li key={dish} className="font-display text-xl leading-snug sm:text-2xl [html[dir=rtl]_&]:font-arabic [html[dir=rtl]_&]:text-lg">{dish}</li>
                  ))}
                </ul>
              </section>

              <Rule />

              <section className="grid gap-3 text-center">
                <h3 className="text-3xl">{c.dessert.title}</h3>
                <p className="text-[15px]">{c.dessert.items.join(" · ")}</p>
              </section>

              <div className="grid gap-1 border-t border-earth/30 pt-5 text-center">
                <span className="font-mono text-3xl tracking-tight text-earth" dir="ltr">{eur(DINNER_PRICE)}</span>
                <span className="text-sm text-muted">{c.price.per}</span>
              </div>

              <section className="grid gap-3 border-t border-dashed border-earth/40 pt-6">
                <h3 className="text-center text-2xl">{c.drinks.title}</h3>
                <ul className="mx-auto grid w-full max-w-sm gap-1.5 text-[15px]">
                  {DRINKS.map((d) => (
                    <li key={d.id} className="flex items-baseline gap-2">
                      <span>{c.drinks.names[d.id]}</span>
                      <span className="mb-1 flex-1 border-b border-dotted border-ink/40" aria-hidden="true" />
                      <span className={d.price ? "font-mono" : "text-sm italic text-muted"} dir={d.price ? "ltr" : undefined}>
                        {d.price ? eur(d.price) : c.drinks.tbc}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <p className="meta text-center text-granite">{c.card.footer}</p>
            </div>
          </article>
        </div>
      </section>

      {/* 3 · The day of a dinner: order by 14:00, served 18:00–21:00 */}
      <section aria-labelledby="timing-title" className="container-site grid gap-10 py-16 lg:py-24">
        <h2 id="timing-title" className="text-4xl lg:text-5xl">{c.timing.title}</h2>
        <div className="grid gap-3" dir="ltr">
          <div className="relative h-14">
            <div className="absolute inset-x-0 top-1/2 h-px bg-ink/30" />
            {/* order deadline */}
            <span className="absolute top-1/2 h-full w-px -translate-y-1/2 bg-earth" style={{ left: `${at(SERVICE.orderBy)}%` }} />
            {/* dinner band */}
            <span
              className="absolute top-1/2 h-8 -translate-y-1/2 rounded-full bg-ink"
              style={{ left: `${at(SERVICE.dinnerFrom)}%`, width: `${at(SERVICE.dinnerTo) - at(SERVICE.dinnerFrom)}%` }}
            />
            {["08:00", "11:00", "14:00", "17:00", "20:00", "23:00"].map((t) => (
              <span key={t} className="meta absolute -bottom-5 -translate-x-1/2 text-granite" style={{ left: `${at(t)}%` }}>{t}</span>
            ))}
          </div>
        </div>
        <ol className="grid gap-8 pt-4 md:grid-cols-3">
          {[
            [c.timing.order, c.timing.orderText, "bg-earth"],
            [c.timing.dinner, c.timing.dinnerText, "bg-ink"],
            [c.timing.lunch, c.timing.lunchText, "border border-ink"],
          ].map(([t, text, dot]) => (
            <li key={t} className="grid content-start gap-2 border-t border-ink/80 pt-4">
              <span className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${dot}`} aria-hidden="true" />
                <span className="font-mono text-2xl tracking-tight">{t}</span>
              </span>
              <p className="text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 4 · Diets + the dining room, and how to order */}
      <section className="relative isolate">
        <div className="relative h-[72svh] min-h-[460px]">
          <Image src={m.room.src} alt={c.alts.room} fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/10" />
        </div>
        <div className="container-site absolute inset-x-0 bottom-0 grid gap-8 pb-12 text-snow lg:grid-cols-12 lg:items-end lg:pb-16">
          <div className="grid gap-4 lg:col-span-6">
            <h2 className="text-5xl lg:text-6xl">{c.cta.title}</h2>
            <p className="max-w-lg text-snow/80">{c.cta.text}</p>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary w-fit bg-snow text-ink hover:bg-ochre">
              <WhatsAppIcon className="h-4 w-4" />
              {c.cta.button}
            </a>
            <p className="text-sm text-snow/75">
              {c.cta.withRoom}{" "}
              <Link href="/rooms" className="font-medium text-ochre hover:underline">{c.cta.roomLink}</Link>
            </p>
          </div>
          <div className="grid gap-3 lg:col-span-5 lg:col-start-8">
            <p className="label text-ochre">{c.diets.title}</p>
            <ul className="flex flex-wrap gap-2">
              {c.diets.items.map((d) => (
                <li key={d} className="rounded-full border border-snow/40 px-3.5 py-1.5 text-sm">{d}</li>
              ))}
            </ul>
            <p className="text-sm text-snow/70">{c.diets.text}</p>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
