import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Temporary holding page: proves fonts, tokens, i18n and RTL work end to end.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const b = await getTranslations("brand");

  return (
    <main className="min-h-dvh grid place-items-center px-4 py-16 text-center">
      <div className="grid gap-7 justify-items-center max-w-xl">
        <Image src="/brand/rbt-stacked-color.svg" alt="Riad Berber Towers" width={420} height={384} priority />
        <p className="label">{t("eyebrow")}</p>
        <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="text-muted">{b("descriptor")} {t("comingSoon")}</p>
        <nav className="flex gap-4 text-sm tracking-[0.16em] uppercase" aria-label="Language">
          {routing.locales.map((l) => (
            <Link key={l} href="/" locale={l} className={l === locale ? "text-earth" : "hover:text-earth"}>
              {l}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
