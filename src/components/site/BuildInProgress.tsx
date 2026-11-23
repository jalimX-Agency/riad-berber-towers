import Image from "next/image";
import { mediaUrl } from "@/lib/media";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localePath } from "@/i18n/routing";
import { site } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

// Page keys and where their title lives in the messages
const titles = {
  rooms: ["nav", "rooms"],
  activities: ["nav", "activities"],
  imlil: ["nav", "imlil"],
  story: ["nav", "story"],
  contact: ["nav", "contact"],
  gallery: ["footer", "gallery"],
  journal: ["footer", "blog"],
  terms: ["footer", "terms"],
  privacy: ["footer", "privacy"],
} as const;

export type WipPage = keyof typeof titles;
type Params = { params: Promise<{ locale: string }> };

async function pageTitle(locale: string, page: WipPage) {
  const [ns, key] = titles[page];
  const t = await getTranslations({ locale, namespace: ns });
  return t(key);
}

/** Placeholder for a route that is not designed yet. Usage in a page file:
 *  const { Page, generateMetadata } = buildInProgressPage("rooms"); export default Page; export { generateMetadata }; */
export function buildInProgressPage(page: WipPage, path = `/${page}`) {
  async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    return {
      title: await pageTitle(locale, page),
      alternates: { canonical: localePath(locale, path) },
      robots: { index: false, follow: true },
    };
  }

  async function Page({ params }: Params) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("wip");
    const title = await pageTitle(locale, page);

    return (
      <section className="container-site relative grid min-h-[72dvh] items-center py-16">
        <div className="grid max-w-2xl gap-6">
          <WipBadge label={t("badge")} />
          <p className="label">{title}</p>
          <h1 className="text-4xl sm:text-6xl">{t("title")}</h1>
          <p className="max-w-[56ch] text-lg text-muted">{t("body")}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {t("whatsapp")}
            </a>
            <Link href="/" className="btn-outline">
              {t("home")}
            </Link>
          </div>
          <p className="meta pt-4 text-granite" dir="ltr">
            {site.email}
          </p>
        </div>
        <Image
          src={mediaUrl("brand/rbt-emblem-color.svg")}
          unoptimized
          alt=""
          width={2483}
          height={2727}
          className="pointer-events-none absolute end-[6vw] top-1/2 hidden h-auto w-[22vw] max-w-[320px] -translate-y-1/2 opacity-[0.12] lg:block"
        />
      </section>
    );
  }

  return { Page, generateMetadata };
}

/** "Build in progress" pill with a pulsing dot. */
export function WipBadge({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full border border-earth/40 px-3 py-1 text-earth ${className}`}>
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-earth opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-earth" />
      </span>
      <span className="label text-earth">{label}</span>
    </span>
  );
}
