import type { Metadata, Viewport } from "next";
import { mediaUrl } from "@/lib/media";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, isRtl, localePath } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { site } from "@/lib/site";
import { getRooms } from "@/lib/rooms";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const languages = Object.fromEntries(routing.locales.map((l) => [l, localePath(l)]));
  return {
    metadataBase: new URL(site.url),
    title: { default: t("title"), template: `%s · ${site.name}` },
    description: t("description"),
    alternates: { canonical: localePath(locale), languages: { ...languages, "x-default": "/" } },
    openGraph: {
      type: "website",
      siteName: site.name,
      title: t("title"),
      description: t("description"),
      url: localePath(locale),
      images: [{ url: mediaUrl("brand/og-image.png"), width: 1200, height: 630, alt: site.name }],
    },
    twitter: { card: "summary_large_image" },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
  };
}

export const viewport: Viewport = { themeColor: "#2F2016" };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const tm = await getTranslations({ locale, namespace: "meta" });
  const rooms = await getRooms(locale).catch(() => []);
  const prices = rooms.map((r) => r.price);
  const url = `${site.url}${localePath(locale)}`;
  // the business as search engines and AI assistants should understand it
  const lodging = {
    "@context": "https://schema.org",
    "@type": ["BedAndBreakfast", "LodgingBusiness"],
    "@id": `${site.url}/#riad`,
    name: site.name,
    description: tm("description"),
    url,
    email: site.email,
    telephone: site.phones,
    image: [mediaUrl("brand/og-image.png"), ...rooms.slice(0, 3).map((r) => r.cover)].filter(Boolean),
    logo: `${site.url}/android-chrome-512.png`,
    slogan: "Breathe the Atlas",
    foundingDate: "2025",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: 31.1355, longitude: -7.9192, elevation: site.altitudeM },
    hasMap: "https://www.google.com/maps/search/?api=1&query=Riad+Berber+Towers+Imlil",
    containedInPlace: { "@type": "Place", name: "Imlil, Toubkal National Park, High Atlas, Morocco" },
    numberOfRooms: site.rooms,
    priceRange: prices.length ? `€${Math.min(...prices)}–€${Math.max(...prices)}` : "€€",
    currenciesAccepted: "EUR, MAD, USD, GBP",
    petsAllowed: false,
    amenityFeature: ["Breakfast included", "Heated floors", "Free Wi-Fi", "Roof terrace with mountain views", "Restaurant (Moroccan and Berber dinner)", "Airport transfer from Marrakech", "Guided hikes and activities"].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    potentialAction: { "@type": "ReserveAction", target: `${site.url}${localePath(locale, "/rooms")}` },
  };
  const website = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${site.url}/#website`, name: site.name, url: site.url, inLanguage: routing.locales, publisher: { "@id": `${site.url}/#riad` } };

  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} className={fontVariables}>
      <body>
        <NextIntlClientProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          <WhatsAppButton />
        </NextIntlClientProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([lodging, website]) }} />
      </body>
    </html>
  );
}
