import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import { setRequestLocale } from "next-intl/server";
import { routing, localePath } from "@/i18n/routing";
import { fill, pagesCopy } from "@/lib/pages";
import { CASH_CURRENCIES, DEPOSIT_PERCENT, EXTRA_GUEST_PERCENT, STANDARD_OCCUPANCY } from "@/lib/booking/policy";

type Kind = "terms" | "privacy";
type Params = { params: Promise<{ locale: string }> };

/** Booking terms and privacy policy share one layout. */
export function legalPage(kind: Kind) {
  async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    const d = pagesCopy(locale).legal[kind];
    return withSocial(locale, {
      title: d.meta.title,
      description: d.meta.description,
      alternates: { canonical: localePath(locale, `/${kind}`), languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, `/${kind}`)])) },
    });
  }

  async function Page({ params }: Params) {
    const { locale } = await params;
    setRequestLocale(locale);
    const legal = pagesCopy(locale).legal;
    const d = legal[kind];
    const vars = { deposit: DEPOSIT_PERCENT, currencies: CASH_CURRENCIES.join(", "), max: STANDARD_OCCUPANCY, percent: EXTRA_GUEST_PERCENT };

    return (
      <article className="container-site grid gap-10 pb-24 pt-8 md:pt-12 lg:grid-cols-12">
        <header className="grid content-start gap-4 lg:col-span-4">
          <h1 className="text-5xl lg:text-6xl">{d.title}</h1>
          <p className="meta text-granite">{legal.updated}</p>
          <nav className="hidden gap-1 pt-4 lg:grid lg:sticky lg:top-28">
            {d.sections.map((s, i) => (
              <a key={s.title} href={`#s${i + 1}`} className="text-sm text-muted hover:text-earth">{s.title}</a>
            ))}
          </nav>
        </header>
        <div className="grid max-w-[68ch] content-start gap-8 lg:col-span-8">
          <p className="text-[17px] leading-relaxed">{d.intro}</p>
          {d.sections.map((s, i) => (
            <section key={s.title} id={`s${i + 1}`} className="grid scroll-mt-28 gap-3 border-t border-rule pt-6">
              <h2 className="text-2xl">{s.title}</h2>
              {s.paras.map((p) => (
                <p key={p.slice(0, 40)} className="leading-relaxed text-ink/85">{fill(p, vars)}</p>
              ))}
            </section>
          ))}
        </div>
      </article>
    );
  }

  return { Page, generateMetadata };
}
