import Image from "next/image";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Mail, MapPin, Phone } from "lucide-react";
import { routing, localePath } from "@/i18n/routing";
import { site } from "@/lib/site";
import { mediaUrl } from "@/lib/media";
import { fill, pagesCopy } from "@/lib/pages";
import { CASH_CURRENCIES, DEPOSIT_PERCENT, EXTRA_GUEST_PERCENT, STANDARD_OCCUPANCY } from "@/lib/booking/policy";
import { WhatsAppIcon } from "@/components/site/icons";

type Props = { params: Promise<{ locale: string }> };

const PHOTO = { src: mediaUrl("photos/reception/dsc00415.webp"), w: 1920, h: 1280 };
const MAP = "https://www.google.com/maps/search/?api=1&query=Riad+Berber+Towers+Imlil";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const c = pagesCopy(locale).contact;
  return {
    title: c.meta.title,
    description: c.meta.description,
    alternates: { canonical: localePath(locale, "/contact"), languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, "/contact")])) },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = pagesCopy(locale).contact;
  const vars = { deposit: DEPOSIT_PERCENT, currencies: CASH_CURRENCIES.join(", "), max: STANDARD_OCCUPANCY, percent: EXTRA_GUEST_PERCENT };
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(c.whatsapp.message)}`;
  const faq = c.faq.items.map((x) => ({ q: x.q, a: fill(x.a, vars) }));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      name: site.name,
      url: site.url,
      email: site.email,
      telephone: site.phones,
      address: { "@type": "PostalAddress", streetAddress: site.address.street, addressLocality: site.address.locality, addressRegion: site.address.region, addressCountry: site.address.country },
      geo: { "@type": "GeoCoordinates", latitude: 31.1355, longitude: -7.9192 },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
    },
  ];

  return (
    <>
      <section className="container-site grid gap-8 pb-12 pt-8 md:pt-12 lg:grid-cols-12 lg:items-end lg:gap-10">
        <div className="grid gap-5 lg:col-span-6">
          <p className="label">{c.label}</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl">{c.title}</h1>
          <p className="max-w-[52ch] text-[17px] text-muted">{c.lead}</p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-card lg:col-span-6">
          <Image src={PHOTO.src} alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>

      {/* ways to reach us */}
      <section className="container-site grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-3 rounded-card bg-ink p-6 text-snow sm:col-span-2 lg:col-span-1">
          <WhatsAppIcon className="h-6 w-6 text-ochre" />
          <h2 className="text-2xl">{c.whatsapp.title}</h2>
          <p className="text-sm text-snow/70">{c.whatsapp.text}</p>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary mt-1 w-fit bg-snow text-ink hover:bg-ochre">{c.whatsapp.button}</a>
        </div>
        <div className="grid content-start gap-3 rounded-card border border-rule bg-snow p-6">
          <Phone className="h-6 w-6 text-earth" aria-hidden="true" strokeWidth={1.5} />
          <h2 className="text-2xl">{c.phone}</h2>
          {site.phones.map((p) => (
            <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="meta w-fit text-sm hover:text-earth" dir="ltr">{p}</a>
          ))}
        </div>
        <div className="grid content-start gap-3 rounded-card border border-rule bg-snow p-6">
          <Mail className="h-6 w-6 text-earth" aria-hidden="true" strokeWidth={1.5} />
          <h2 className="text-2xl">{c.email.title}</h2>
          <p className="text-sm text-muted">{c.email.text}</p>
          <a href={`mailto:${site.email}`} className="w-fit break-all text-sm font-medium hover:text-earth" dir="ltr">{site.email}</a>
        </div>
        <div className="grid content-start gap-3 rounded-card border border-rule bg-snow p-6">
          <MapPin className="h-6 w-6 text-earth" aria-hidden="true" strokeWidth={1.5} />
          <h2 className="text-2xl">{c.address.title}</h2>
          <address className="text-sm not-italic text-muted">
            {c.address.lines.map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </address>
          <a href={MAP} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-medium text-earth hover:underline">{c.address.map}</a>
        </div>
      </section>

      {/* finding us + FAQ */}
      <section className="border-t border-rule bg-snow py-16 lg:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="grid content-start gap-4 lg:col-span-4">
            <h2 className="text-3xl lg:text-4xl">{c.find.title}</h2>
            <p className="text-muted">{c.find.text}</p>
            <p className="meta text-granite" dir="ltr">31.14° N · 7.92° W · 1,740 m</p>
          </div>
          <div className="grid gap-4 lg:col-span-8">
            <h2 className="text-3xl lg:text-4xl">{c.faq.title}</h2>
            <div className="grid divide-y divide-rule border-y border-rule">
              {faq.map((x) => (
                <details key={x.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {x.q}
                    <span className="text-xl leading-none text-earth transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="pt-2 text-muted">{x.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
