import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { WipBadge } from "@/components/site/BuildInProgress";

// Temporary holding page until the home page is designed (phase 3).
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const b = await getTranslations("brand");
  const w = await getTranslations("wip");

  return (
    <section className="container-site grid min-h-[78dvh] place-items-center py-16 text-center">
      <div className="grid max-w-xl justify-items-center gap-7">
        <Image src="/brand/rbt-emblem-color.svg" alt="" width={2483} height={2727} priority className="h-auto w-44" />
        <WipBadge label={w("badge")} />
        <p className="label">{t("eyebrow")}</p>
        <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="text-muted">
          {b("descriptor")} {t("comingSoon")}
        </p>
        <Link href="/rooms" className="btn-outline">
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
