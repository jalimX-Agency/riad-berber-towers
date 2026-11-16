import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, Check, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing, localePath } from "@/i18n/routing";
import { site } from "@/lib/site";
import { formatPrice } from "@/lib/rooms";
import type { Photo } from "@/lib/home-media";
import { ACTIVITY_SLUGS, COOKING, OUTINGS, activitiesCopy, activityMedia, pexels, type ActivitiesCopy } from "@/lib/activities";
import { WhatsAppIcon } from "@/components/site/icons";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => ACTIVITY_SLUGS.map((slug) => ({ locale, slug })));
}

type View = {
  slug: string;
  name: string;
  kind: string;
  summary: string;
  price: number;
  facts: { label: string; value: string }[];
  photos: (Photo & { alt: string })[];
  stock: boolean; // illustrative stock photos (credited)
};

function view(c: ActivitiesCopy, slug: string): View | null {
  if (slug === COOKING.slug) {
    const m = activityMedia;
    return {
      slug,
      name: c.cooking.title,
      kind: c.cooking.label,
      summary: c.cooking.lead,
      price: COOKING.price,
      facts: [
        { label: c.outings.facts.duration, value: c.cooking.duration },
        { label: c.outings.facts.departure, value: c.detail.from },
      ],
      photos: [
        { ...m.ingredients, alt: c.cooking.alts.ingredients },
        { ...m.bread, alt: c.cooking.alts.bread },
        { ...m.tagine, alt: c.cooking.alts.tagine },
      ],
      stock: false,
    };
  }
  const o = OUTINGS.find((x) => x.slug === slug);
  if (!o) return null;
  const it = c.outings.items[o.id];
  const keys = ["duration", "distance", "highest", "gain", "difficulty", "departure"] as const;
  return {
    slug,
    name: it.name,
    kind: it.kind,
    summary: it.summary,
    price: o.price,
    facts: keys.filter((k) => it.facts[k]).map((k) => ({ label: c.outings.facts[k], value: it.facts[k]! })),
    photos: o.photos.map((id) => ({ ...pexels(id), alt: it.name })),
    stock: true,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = activitiesCopy(locale);
  const v = view(c, slug);
  if (!v) return {};
  const path = `/activities/${slug}`;
  return {
    title: v.name,
    description: v.summary,
    alternates: {
      canonical: localePath(locale, path),
      languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, path)])),
    },
    openGraph: { images: [{ url: v.photos[0].src, width: v.photos[0].w, height: v.photos[0].h }] },
  };
}

export default async function ActivityPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const c = activitiesCopy(locale);
  const v = view(c, slug);
  if (!v) notFound();

  const price = formatPrice(v.price, "EUR", locale);
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(c.whatsappMessage.replace("{activity}", v.name))}`;
  const outing = OUTINGS.find((o) => o.slug === slug);
  const item = outing ? c.outings.items[outing.id] : null;
  const others = ACTIVITY_SLUGS.filter((s) => s !== slug).map((s) => view(c, s)!);
  const [hero, ...rest] = v.photos;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: v.name,
    description: v.summary,
    image: v.photos.map((p) => p.src),
    url: `${site.url}${localePath(locale, `/activities/${slug}`)}`,
    provider: { "@type": "LodgingBusiness", name: site.name, url: site.url },
    offers: { "@type": "Offer", price: v.price, priceCurrency: "EUR", availability: "https://schema.org/InStock" },
  };

  return (
    <>
      <div className="container-site pt-6 md:pt-10">
        <Link href="/activities" className="meta inline-flex items-center gap-2 text-granite hover:text-earth">
          <ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden="true" />
          {c.detail.back}
        </Link>
      </div>

      {/* 1 · Title + photos */}
      <section className="container-site grid gap-6 pb-10 pt-5 lg:grid-cols-12 lg:gap-10">
        <header className="grid content-start gap-4 lg:col-span-5 lg:pt-6">
          <p className="label">{v.kind}</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl">{v.name}</h1>
          <p className="text-[17px] text-muted">{v.summary}</p>
        </header>
        <div className="grid grid-cols-2 gap-3 lg:col-span-7">
          <div className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-card sm:aspect-[16/10]">
            <Image src={hero.src} alt={hero.alt} fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
          </div>
          {rest.map((p) => (
            <div key={p.src} className="relative aspect-[4/3] overflow-hidden rounded-card">
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 28vw, 50vw" className="object-cover" />
            </div>
          ))}
          {v.stock && <p className="meta col-span-2 text-granite">{c.detail.photoCredit}</p>}
        </div>
      </section>

      {/* 2 · Description + booking card */}
      <section className="container-site grid gap-10 border-t border-rule py-12 lg:grid-cols-12 lg:gap-10 lg:py-16">
        <div className="grid content-start gap-10 lg:col-span-7">
          <div className="grid gap-4">
            <h2 className="text-3xl">{c.detail.description}</h2>
            <div className="grid max-w-[68ch] gap-4 text-[17px] leading-relaxed text-ink/85">
              {(item ? item.body : c.cooking.intro).map((para) => (
                <p key={para.slice(0, 32)}>{para}</p>
              ))}
            </div>
          </div>

          {item && (
            <div className="grid gap-4">
              <h2 className="text-3xl">{c.outings.highlights}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {item.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-earth" aria-hidden="true" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!item && (
            <div className="grid gap-5">
              <h2 className="text-3xl">{c.cooking.programmeTitle}</h2>
              <ol className="grid border-s border-rule">
                {c.cooking.programme.map((s) => (
                  <li key={s.time} className="relative grid gap-1 pb-7 ps-6">
                    <span className="absolute -start-[5px] top-1.5 h-[9px] w-[9px] rounded-full border border-earth bg-paper" aria-hidden="true" />
                    <span className="meta text-earth" dir="ltr">{s.time}</span>
                    <h3 className="text-2xl">{s.title}</h3>
                    <ul className="grid gap-1 text-muted">
                      {s.points.map((pt) => (
                        <li key={pt} className="flex gap-2">
                          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-granite" aria-hidden="true" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
                <li className="relative ps-6">
                  <span className="absolute -start-[5px] top-1.5 h-[9px] w-[9px] rounded-full bg-earth" aria-hidden="true" />
                  <span className="meta text-earth">{c.cooking.end}</span>
                </li>
              </ol>
              <div className="grid grid-cols-2 gap-3">
                {[activityMedia.breadShaping, activityMedia.tagineStove].map((p, i) => (
                  <div key={p.src} className="relative aspect-[3/4] overflow-hidden rounded-card">
                    <Image src={p.src} alt={i === 0 ? c.cooking.alts.bread : c.cooking.alts.tagine} fill sizes="(min-width: 1024px) 28vw, 50vw" className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="order-first lg:order-none lg:col-span-5">
          <div className="grid gap-5 rounded-card border border-rule bg-snow p-6 sm:p-8 lg:sticky lg:top-28">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-4xl tracking-tight" dir="ltr">{price}</span>
              <span className="text-muted">{c.perPerson}</span>
            </div>
            {outing && (
              <p className="flex items-center gap-3 text-sm text-muted">
                {c.outings.levelLabel}
                <span className="inline-flex gap-1" aria-hidden="true">
                  {[1, 2, 3].map((i) => (
                    <span key={i} className={`h-1.5 w-5 rounded-full ${i <= outing.level[0] ? "bg-earth" : i <= outing.level[1] ? "bg-earth/35" : "bg-rule"}`} />
                  ))}
                </span>
              </p>
            )}
            <dl className="grid gap-3 border-y border-rule py-4">
              {v.facts.map((f) => (
                <div key={f.label} className="grid grid-cols-[8.5rem_1fr] gap-3 text-sm">
                  <dt className="label pt-0.5 text-[0.65rem]">{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            {!item && (
              <p className="text-sm text-muted">
                <span className="font-medium text-ink">{c.cooking.includesTitle} · </span>
                {c.cooking.includes}
              </p>
            )}
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary justify-center">
              <WhatsAppIcon className="h-4 w-4" />
              {c.book}
            </a>
            <a href={`mailto:${site.email}?subject=${encodeURIComponent(v.name)}`} className="btn-outline justify-center">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {c.contact.email}
            </a>
          </div>
        </aside>
      </section>

      {/* 3 · Good to know */}
      <section className="border-t border-rule bg-snow py-14 lg:py-20">
        <div className="container-site grid gap-6">
          <div className="grid gap-2">
            <p className="label">{c.info.label}</p>
            <h2 className="text-3xl lg:text-4xl">{c.info.title}</h2>
          </div>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.info.items.map((x) => (
              <div key={x.title} className="grid gap-1 border-t border-ink/80 pt-3">
                <dt className="font-medium">{x.title}</dt>
                <dd className="text-sm text-muted">{x.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 4 · Other activities */}
      <section className="container-site grid gap-6 py-14 lg:py-20">
        <h2 className="text-3xl lg:text-4xl">{c.detail.others}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/activities/${o.slug}`} className="group grid gap-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-card">
                  <Image src={o.photos[0].src} alt="" fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                <div className="grid gap-0.5">
                  <span className="font-display text-xl leading-tight group-hover:text-earth [html[dir=rtl]_&]:font-arabic-display">{o.name}</span>
                  <span className="meta text-granite" dir="ltr">{formatPrice(o.price, "EUR", locale)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
