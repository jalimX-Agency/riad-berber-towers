import Image from "next/image";
import { withSocial } from "@/lib/seo";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TRANSFER_PRICE } from "@/lib/booking/extras";
import { ArrowUpRight, Car, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing, localePath } from "@/i18n/routing";
import { site } from "@/lib/site";
import { formatPrice } from "@/lib/rooms";
import { OUTINGS, COOKING, activityMedia, activitiesCopy, pexels } from "@/lib/activities";
import { WhatsAppIcon } from "@/components/site/icons";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const c = activitiesCopy(locale);
  return withSocial(locale, {
    title: c.meta.title,
    description: c.meta.description,
    alternates: {
      canonical: localePath(locale, "/activities"),
      languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, "/activities")])),
    },
    openGraph: { images: [{ url: activityMedia.ingredients.src, width: activityMedia.ingredients.w, height: activityMedia.ingredients.h }] },
  });
}

/** Effort on a 3-step scale; a range (easy → challenging) fills the steps in between. */
function Level({ level, label }: { level: readonly [number, number]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${label}: ${level[0] === level[1] ? level[0] : `${level[0]}–${level[1]}`} / 3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-5 rounded-full ${i <= level[0] ? "bg-earth" : i <= level[1] ? "bg-earth/35" : "bg-rule"}`}
        />
      ))}
    </span>
  );
}

export default async function ActivitiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = activitiesCopy(locale);
  const tb = await getTranslations("book");
  const price = (n: number) => formatPrice(n, "EUR", locale);
  const wa = (activity: string) =>
    `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(c.whatsappMessage.replace("{activity}", activity))}`;
  const m = activityMedia;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      { name: c.cooking.title, description: c.cooking.lead, price: COOKING.price },
      ...OUTINGS.map((o) => ({ name: c.outings.items[o.id].name, description: c.outings.items[o.id].summary, price: o.price })),
    ].map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "TouristTrip",
        name: a.name,
        description: a.description,
        provider: { "@type": "LodgingBusiness", name: site.name, url: site.url },
        offers: { "@type": "Offer", price: a.price, priceCurrency: "EUR" },
      },
    })),
  };

  return (
    <>
      {/* 1 · Hero */}
      <section className="container-site grid gap-8 pb-12 pt-8 md:pt-12 lg:grid-cols-12 lg:items-end lg:gap-10 lg:pb-20">
        <div className="grid gap-5 lg:col-span-5">
          <p className="label">{c.hero.label}</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl">{c.hero.title}</h1>
          <p className="max-w-[52ch] text-[17px] text-muted">{c.hero.lead}</p>
          <nav aria-label={c.hero.label} className="flex flex-wrap gap-2 pt-1">
            <a href="#cooking" className="btn-outline px-5 py-2.5">{c.hero.jumpCooking}</a>
            <a href="#outings" className="btn-outline px-5 py-2.5">{c.hero.jumpOutings}</a>
          </nav>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-card lg:col-span-7 lg:aspect-[16/10]">
          <Image src={m.hero.src} alt={c.hero.alt} fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
        </div>
      </section>

      {/* 2 · Cooking class */}
      <section id="cooking" aria-labelledby="cooking-title" className="scroll-mt-24 bg-walnut py-16 text-snow lg:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="grid content-start gap-5 lg:col-span-5">
            <p className="label text-ochre">{c.cooking.label}</p>
            <h2 id="cooking-title" className="text-4xl lg:text-5xl">{c.cooking.title}</h2>
            <p className="text-snow/75">{c.cooking.lead}</p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-snow/20 pt-4">
              <span className="font-mono text-3xl tracking-tight" dir="ltr">{price(COOKING.price)}</span>
              <span className="text-sm text-snow/70">{c.perPerson}</span>
              <span className="meta basis-full text-ochre">{c.cooking.duration}</span>
            </div>
            <p className="text-sm text-snow/70">
              <span className="font-medium text-snow">{c.cooking.includesTitle} · </span>
              {c.cooking.includes}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/activities/${COOKING.slug}`} className="btn-primary bg-snow text-ink hover:bg-ochre">
                {c.detail.details}
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
              <a href={wa(c.cooking.title)} target="_blank" rel="noopener noreferrer" className="btn-outline border-snow/60 text-snow hover:border-ochre hover:text-ochre">
                <WhatsAppIcon className="h-4 w-4" />
                {c.book}
              </a>
            </div>
          </div>

          <div className="grid gap-10 lg:col-span-7">
            {/* photos: the table laid out, then hands in the dough and the tagine on the stove */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-card sm:aspect-[16/10]">
                <Image src={m.ingredients.src} alt={c.cooking.alts.ingredients} fill sizes="(min-width: 1024px) 55vw, 100vw" className="reveal-clip object-cover" />
              </div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-card">
                <Image src={m.bread.src} alt={c.cooking.alts.bread} fill sizes="(min-width: 1024px) 27vw, 50vw" className="object-cover" />
              </div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-card">
                <Image src={m.tagine.src} alt={c.cooking.alts.tagine} fill sizes="(min-width: 1024px) 27vw, 50vw" className="object-cover" />
              </div>
            </div>

            <div className="grid gap-4">
              <h3 className="text-2xl">{c.cooking.programmeTitle}</h3>
              <ol className="grid border-s border-snow/25">
                {c.cooking.programme.map((s) => (
                  <li key={s.time} className="relative grid gap-0.5 pb-5 ps-6 last:pb-0 sm:grid-cols-[5rem_1fr] sm:gap-4">
                    <span className="absolute -start-[5px] top-1.5 h-[9px] w-[9px] rounded-full border border-ochre bg-walnut" aria-hidden="true" />
                    <span className="meta pt-0.5 text-ochre" dir="ltr">{s.time}</span>
                    <span>
                      <span className="block font-medium">{s.title}</span>
                      <span className="text-sm text-snow/70">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* 3 · Hikes and biking */}
      <section id="outings" aria-labelledby="outings-title" className="container-site scroll-mt-24 py-16 lg:py-24">
        <header className="grid gap-3 pb-10 lg:grid-cols-2 lg:items-end lg:gap-10">
          <div className="grid gap-3">
            <p className="label">{c.outings.label}</p>
            <h2 id="outings-title" className="text-4xl lg:text-6xl">{c.outings.title}</h2>
          </div>
          <p className="max-w-lg text-muted lg:justify-self-end">{c.outings.lead}</p>
        </header>

        <div className="grid gap-6">
          {OUTINGS.map((o, i) => {
            const it = c.outings.items[o.id];
            const facts = (["duration", "distance", "highest", "gain", "difficulty", "departure"] as const).filter((k) => it.facts[k]);
            return (
              <article key={o.id} aria-labelledby={`${o.id}-title`} className="grid gap-6 rounded-card border border-rule bg-snow p-5 sm:p-8 lg:grid-cols-12 lg:gap-10">
                <div className="grid content-start gap-3 lg:col-span-5">
                  <p className="meta text-granite" dir="ltr">0{i + 1} / 0{OUTINGS.length}</p>
                  <h3 id={`${o.id}-title`} className="text-3xl lg:text-4xl">
                    <Link href={`/activities/${o.slug}`} className="hover:text-earth">{it.name}</Link>
                  </h3>
                  <p className="text-sm text-muted">{it.kind}</p>
                  <p className="text-[17px]">{it.summary}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                    <span className="font-mono text-2xl tracking-tight" dir="ltr">{price(o.price)}</span>
                    <span className="text-sm text-muted">{c.perPerson}</span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      <Level level={o.level} label={c.outings.levelLabel} />
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <Link href={`/activities/${o.slug}`} className="btn-primary">
                      {c.detail.details}
                      <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                    </Link>
                    <a href={wa(it.name)} target="_blank" rel="noopener noreferrer" className="btn-outline">
                      <WhatsAppIcon className="h-4 w-4" />
                      {c.book}
                    </a>
                  </div>
                </div>

                <div className="grid content-start gap-6 lg:col-span-7">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-rule py-4 sm:grid-cols-3">
                    {facts.map((k) => (
                      <div key={k} className="grid gap-0.5">
                        <dt className="label text-[0.65rem]">{c.outings.facts[k]}</dt>
                        <dd className="text-sm">{it.facts[k]}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link href={`/activities/${o.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/9] overflow-hidden rounded-card">
                    <Image src={pexels(o.photos[0]).src} alt="" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
                  </Link>
                  <div className="grid gap-2">
                    <p className="label">{c.outings.highlights}</p>
                    <ul className="flex flex-wrap gap-2">
                      {it.highlights.map((h) => (
                        <li key={h} className="rounded-full border border-rule px-3 py-1 text-sm">{h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 4 · Further afield: Toubkal Peaks (the owner's agency) and the Marrakech transfer */}
      <section aria-labelledby="partner-title" className="container-site grid gap-4 pb-16 lg:grid-cols-12 lg:pb-24">
        <div className="relative isolate grid overflow-hidden rounded-card bg-ink text-snow lg:col-span-8 lg:grid-cols-2">
          <div className="relative min-h-[240px]">
            <Image src={pexels("tp-im9").src} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
          </div>
          <div className="grid content-start gap-4 p-6 sm:p-8">
            <p className="label text-ochre">{c.partner.label}</p>
            <h2 id="partner-title" className="text-3xl lg:text-4xl">{c.partner.title}</h2>
            <p className="text-sm text-snow/75">{c.partner.text}</p>
            <ul className="grid gap-1.5 text-sm">
              {c.partner.items.map((x) => (
                <li key={x} className="flex gap-2.5">
                  <span className="mt-2 h-1 w-3 shrink-0 bg-ochre" aria-hidden="true" />
                  {x}
                </li>
              ))}
            </ul>
            <a href={site.partner.url} target="_blank" rel="noopener" className="group mt-1 inline-flex w-fit items-center gap-2 border-b border-snow/40 pb-1 text-sm uppercase tracking-[0.16em] hover:border-ochre hover:text-ochre">
              {c.partner.cta}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="grid content-start gap-4 rounded-card border border-rule bg-snow p-6 sm:p-8 lg:col-span-4">
          <Car className="h-7 w-7 text-earth" aria-hidden="true" strokeWidth={1.5} />
          <h2 className="text-3xl">{c.transfer.title}</h2>
          <p className="flex items-baseline gap-2">
            <span className="font-mono text-2xl tracking-tight" dir="ltr">{price(TRANSFER_PRICE)}</span>
            <span className="text-sm text-muted">{tb("transfer.price")}</span>
          </p>
          <p className="text-sm text-muted">{c.transfer.text}</p>
          <a href={wa(c.transfer.title)} target="_blank" rel="noopener noreferrer" className="btn-outline w-fit">
            <WhatsAppIcon className="h-4 w-4" />
            {c.transfer.cta}
          </a>
        </div>
      </section>

      {/* 5 · Good to know + contact */}
      <section className="border-t border-rule bg-snow py-16 lg:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="grid content-start gap-6 lg:col-span-7">
            <div className="grid gap-3">
              <p className="label">{c.info.label}</p>
              <h2 className="text-4xl">{c.info.title}</h2>
            </div>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {c.info.items.map((x) => (
                <div key={x.title} className="grid gap-1 border-t border-ink/80 pt-3">
                  <dt className="font-medium">{x.title}</dt>
                  <dd className="text-sm text-muted">{x.text}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid content-start gap-5 rounded-card bg-ink p-6 text-snow sm:p-10 lg:col-span-5">
            <p className="label text-ochre">{c.contact.label}</p>
            <h2 className="text-4xl">{c.contact.title}</h2>
            <p className="text-snow/70">{c.contact.text}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a href={wa(c.hero.title)} target="_blank" rel="noopener noreferrer" className="btn-primary bg-snow text-ink hover:bg-ochre">
                <WhatsAppIcon className="h-4 w-4" />
                {c.contact.whatsapp}
              </a>
              <a href={`mailto:${site.email}`} className="btn-outline border-snow/60 text-snow hover:border-ochre hover:text-ochre">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {c.contact.email}
              </a>
            </div>
            <p className="meta text-snow/60" dir="ltr">{site.phones[0]}</p>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
