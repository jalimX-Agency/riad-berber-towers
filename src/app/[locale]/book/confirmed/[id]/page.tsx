import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleCheck, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { formatPrice } from "@/lib/rooms";
import { formatStayDate } from "@/lib/email/booking";
import { WhatsAppIcon } from "@/components/site/icons";
import { DEPOSIT_PERCENT } from "@/lib/booking/policy";
import { bookingPayment } from "@/lib/booking/payment";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "book" });
  return { title: t("confirmed.title"), robots: { index: false, follow: false } };
}

// The id is an unguessable cuid; the page shows no contact details beyond the guest's first name and email.
export default async function ConfirmedPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("book");
  const ts = await getTranslations("search");

  const b = await db.booking.findUnique({
    where: { id },
    include: { guest: { select: { firstName: true, email: true } }, room: { include: { translations: true } } },
  });
  if (!b) notFound();
  const pay = bookingPayment(b);
  const roomName = b.room.translations.find((x) => x.locale === locale)?.name || b.room.name;
  const whatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(t("confirmed.whatsappMessage", { reference: b.reference }))}`;

  return (
    <section className="container-site grid max-w-2xl gap-8 pb-24 pt-12 md:pt-16">
      <div className="grid justify-items-center gap-3 text-center">
        <CircleCheck className="h-12 w-12 text-earth" aria-hidden="true" />
        <h1 className="text-4xl sm:text-5xl">{t("confirmed.title")}</h1>
        <p className="max-w-[55ch] text-muted">{t("confirmed.body", { name: b.guest.firstName, email: b.guest.email })}</p>
      </div>

      <div className="grid gap-4 rounded-[10px] border border-rule bg-snow p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="label">{t("reference")}</span>
          <span className="font-mono text-2xl tracking-[0.12em] text-earth" dir="ltr">
            {b.reference}
          </span>
        </div>
        <dl className="grid border-t border-rule text-sm">
          {[
            [t("room"), roomName],
            [ts("checkIn"), formatStayDate(b.checkIn, locale)],
            [ts("checkOut"), formatStayDate(b.checkOut, locale)],
            [t("stay"), `${ts("nights", { count: b.nights })}, ${ts("adults", { count: b.adults })}`],
            [t("bed"), t(`beds.${b.bedSetup}`)],
            [t("total"), formatPrice(Number(b.total), b.currency, locale)],
            [t("deposit", { percent: DEPOSIT_PERCENT }), formatPrice(pay.deposit, b.currency, locale)],
            [t("balance"), formatPrice(pay.balance, b.currency, locale)],
            [t("status"), t("pending")],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-rule py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd className="text-end font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted">{t("confirmed.next")}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary">
          <WhatsAppIcon className="h-4 w-4" />
          {t("confirmed.whatsapp")}
        </a>
        <a href={`mailto:${site.email}?subject=${encodeURIComponent(b.reference)}`} className="btn-outline">
          <Mail className="h-4 w-4" aria-hidden="true" />
          {site.email}
        </a>
      </div>
      <p className="text-center">
        <Link href="/" className="text-sm text-earth underline underline-offset-4">
          {t("confirmed.home")}
        </Link>
      </p>
    </section>
  );
}
