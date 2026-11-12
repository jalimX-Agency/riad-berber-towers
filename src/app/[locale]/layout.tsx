import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, isRtl, localePath } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { site } from "@/lib/site";
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
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: site.name }],
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

  const lodging = {
    "@context": "https://schema.org",
    "@type": "BedAndBreakfast",
    name: site.name,
    url: site.url,
    email: site.email,
    telephone: site.phones[0],
    image: `${site.url}/og-image.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    numberOfRooms: site.rooms,
    priceRange: "€€",
  };

  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} className={fontVariables}>
      <body>
        <NextIntlClientProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          <WhatsAppButton />
        </NextIntlClientProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lodging) }} />
      </body>
    </html>
  );
}
