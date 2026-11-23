import Image from "next/image";
import { mediaUrl } from "@/lib/media";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { footerNav } from "@/lib/nav";
import { site } from "@/lib/site";
import { WeaveBand } from "./WeaveBand";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { WhatsAppIcon } from "./icons";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const brand = await getTranslations("brand");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-snow">
      <WeaveBand />
      <div className="container-site grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div className="grid content-start gap-5">
          <Image src={mediaUrl("brand/rbt-stacked-ivory.svg")} unoptimized alt="Riad Berber Towers" width={3904} height={3606} className="h-auto w-48" />
          <p className="max-w-[28ch] text-sm text-snow/70">{brand("descriptor")}</p>
        </div>

        <nav aria-label={t("explore")} className="grid content-start gap-3">
          <p className="label text-ochre">{t("explore")}</p>
          {footerNav.map((item) => (
            <Link key={item.href} href={item.href} className="w-fit text-snow/85 hover:text-ochre">
              {item.ns === "nav" ? nav(item.key) : t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="grid content-start gap-3">
          <p className="label text-ochre">{t("contact")}</p>
          <address className="not-italic text-snow/85">{t("address")}</address>
          {site.phones.map((p) => (
            <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="meta w-fit text-sm text-snow/85 hover:text-ochre" dir="ltr">
              {p}
            </a>
          ))}
          <a href={`mailto:${site.email}`} className="w-fit break-all text-snow/85 hover:text-ochre">{site.email}</a>
          <a
            href={`https://wa.me/${site.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex w-fit items-center gap-2 text-snow hover:text-ochre"
          >
            <WhatsAppIcon className="h-4 w-4" /> WhatsApp
          </a>
          <p className="mt-3 text-xs text-snow/60">
            {t("partner")}{" "}
            <a href={site.partner.url} target="_blank" rel="noopener" className="text-snow/85 underline-offset-4 hover:text-ochre hover:underline">{site.partner.name}</a>
          </p>
        </div>

        <div className="grid content-start gap-3">
          <p className="label text-ochre">{t("gettingHere")}</p>
          <p className="text-snow/85">{t("fromMarrakech")}</p>
          <p className="text-snow/85">{t("trail")}</p>
          <p className="meta mt-2 text-granite" dir="ltr">31.14° N · 7.92° W · 1,740 m</p>
        </div>
      </div>

      <div className="border-t border-snow/10">
        <div className="container-site flex flex-col gap-4 py-6 pe-24 text-xs text-snow/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.name}. {t("rights")}
          </p>
          <p className="font-display text-base italic text-granite" lang="en">{brand("tagline")}</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-ochre">{t("terms")}</Link>
            <Link href="/privacy" className="hover:text-ochre">{t("privacy")}</Link>
            <LanguageSwitcher tone="dark" placement="up" />
          </div>
        </div>
      </div>
    </footer>
  );
}
