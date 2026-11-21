import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleCheck, Clock, Download, ExternalLink, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/rooms";
import { formatStayDate } from "@/lib/email/booking";
import { bookingPayment } from "@/lib/booking/payment";
import { groupMembers, groupPayment } from "@/lib/booking/group";
import { DEPOSIT_PERCENT } from "@/lib/booking/policy";
import { StayPolicies } from "@/components/booking/StayPolicies";
import { ProofUpload } from "@/components/booking/ProofUpload";
import { CopyField } from "@/components/booking/CopyField";
import { WhatsAppIcon } from "@/components/site/icons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pay" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * The guest's payment page, reached from the "accepted" email. The token is a 32-character random secret.
 * Step 1: pay the deposit (PayPal, Wise or bank transfer). Step 2: upload the proof. Then the riad checks it and confirms.
 */
export default async function PayPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  if (!/^[\w-]{20,64}$/.test(token)) notFound();

  const b = await db.booking.findFirst({
    where: { payToken: token },
    include: {
      guest: { select: { firstName: true } },
      room: { include: { translations: true } },
      _count: { select: { proofs: true } },
    },
  });
  if (!b) notFound();

  const t = await getTranslations("pay");
  const tb = await getTranslations("book");
  const ts = await getTranslations("search");
  // several rooms booked together: one payment for the whole reservation
  const group = await groupMembers(b.id, { room: { include: { translations: true } } });
  const rooms = group.length > 1 ? group : [b];
  const roomName = rooms.map((r) => r.room.translations.find((x) => x.locale === locale)?.name || r.room.name).join(", ");
  const adults = rooms.reduce((s, r) => s + r.adults, 0);
  const pay = rooms.length > 1 ? groupPayment(rooms) : bookingPayment(b);
  const money = (n: number) => formatPrice(n, b.currency, locale);
  const settings = await getSettings();
  const { paypalMe } = settings;
  const paypal = paypalMe ? `https://paypal.me/${paypalMe}/${pay.deposit}${b.currency}` : null;
  const whatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(t("whatsappMessage", { reference: b.reference }))}`;
  const confirmed = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status);
  const open = b.status === "AWAITING_PAYMENT" || b.status === "PAYMENT_REVIEW";

  const summary = (
    <dl className="grid border-t border-rule text-sm">
      {[
        [tb("reference"), b.reference],
        [tb("room"), roomName],
        [ts("checkIn"), formatStayDate(b.checkIn, locale)],
        [ts("checkOut"), formatStayDate(b.checkOut, locale)],
        [tb("stay"), `${ts("nights", { count: b.nights })}, ${ts("adults", { count: adults })}`],
        [tb("bed"), tb(`beds.${b.bedSetup}`)],
        [tb("total"), money(pay.total)],
        [tb("deposit", { percent: DEPOSIT_PERCENT }), money(pay.deposit)],
        [tb("balance"), money(pay.balance)],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-rule py-2.5">
          <dt className="text-muted">{k}</dt>
          <dd className="text-end font-medium" dir="auto">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <section className="container-site grid max-w-2xl gap-8 pb-24 pt-12 md:pt-16">
      {/* header by status */}
      <div className="grid justify-items-center gap-3 text-center">
        {confirmed ? (
          <CircleCheck className="h-12 w-12 text-emerald-700" aria-hidden="true" />
        ) : b.status === "CANCELLED" ? (
          <XCircle className="h-12 w-12 text-earth" aria-hidden="true" />
        ) : b.status === "PAYMENT_REVIEW" ? (
          <Clock className="h-12 w-12 text-earth" aria-hidden="true" />
        ) : null}
        <p className="label">{b.reference}</p>
        <h1 className="text-4xl sm:text-5xl">
          {confirmed ? t("confirmedTitle") : b.status === "CANCELLED" ? t("cancelledTitle") : b.status === "PAYMENT_REVIEW" ? t("reviewTitle") : t("title", { name: b.guest.firstName })}
        </h1>
        <p className="max-w-[55ch] text-muted">
          {confirmed ? t("confirmedText") : b.status === "CANCELLED" ? t("cancelledText") : b.status === "PAYMENT_REVIEW" ? t("reviewText") : t("intro", { percent: DEPOSIT_PERCENT })}
        </p>
      </div>

      <div className="grid gap-4 rounded-[10px] border border-rule bg-snow p-6">{summary}</div>

      {confirmed && (
        <a href={`/api/booking/voucher/${token}`} className="btn-primary justify-center">
          <Download className="h-4 w-4" aria-hidden="true" />
          {t("downloadVoucher")}
        </a>
      )}

      {open && (
        <ol className="grid gap-6">
          {/* step 1: pay */}
          <li className="grid gap-4 rounded-[10px] border border-rule bg-paper p-6">
            <p className="label">{t("step1")}</p>
            <h2 className="text-2xl">{t("payTitle", { amount: money(pay.deposit) })}</h2>
            {paypal || settings.wiseLink || settings.bankIban ? (
              <>
                <p className="text-sm text-muted">{t("payText", { reference: b.reference })}</p>
                <div className="grid gap-3">
                  {paypal && (
                    <div className="grid gap-3 rounded-[10px] border border-rule bg-snow p-4">
                      <h3 className="text-lg">PayPal</h3>
                      <a href={paypal} target="_blank" rel="noopener noreferrer" className="btn-primary w-fit">
                        {t("payButton", { amount: money(pay.deposit) })}
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                  )}
                  {settings.wiseLink && (
                    <div className="grid gap-4 rounded-[10px] border border-rule bg-snow p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="grid gap-3">
                        <h3 className="text-lg">{t("wiseTitle")}</h3>
                        <p className="text-sm text-muted">{t("wiseText", { amount: money(pay.deposit) })}</p>
                        <a href={settings.wiseLink} target="_blank" rel="noopener noreferrer" className="btn-outline w-fit">
                          {t("wiseButton")}
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </div>
                      {settings.wiseLink === site.wiseLink && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/brand/wise-qr.jpg" alt={t("wiseQrAlt")} width={140} height={140} className="h-[140px] w-[140px] rounded-[10px] border border-rule" />
                      )}
                    </div>
                  )}
                  {settings.bankIban && (
                    <div className="grid gap-3 rounded-[10px] border border-rule bg-snow p-4">
                      <h3 className="text-lg">{t("bankTitle")}</h3>
                      <p className="text-sm text-muted">{t("bankText", { amount: money(pay.deposit), currency: settings.bankCurrency || "MAD" })}</p>
                      <div className="grid">
                        {settings.bankName && <CopyField label={t("bankName")} value={settings.bankName} />}
                        {settings.bankHolder && <CopyField label={t("bankHolder")} value={settings.bankHolder} />}
                        <CopyField label={t("bankIban")} value={settings.bankIban.replace(/(.{4})/g, "$1 ").trim()} mono />
                        {settings.bankSwift && <CopyField label={t("bankSwift")} value={settings.bankSwift} mono />}
                        <CopyField label={t("bankReference")} value={b.reference} mono />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">{t("payContact")}</p>
            )}
          </li>

          {/* step 2: proof */}
          <li className="grid gap-4 rounded-[10px] border border-rule bg-paper p-6">
            <p className="label">{t("step2")}</p>
            <h2 className="text-2xl">{t("proofTitle")}</h2>
            <p className="text-sm text-muted">{t("proofText")}</p>
            {b._count.proofs > 0 && <p className="text-sm font-medium text-emerald-800">{t("proofsSent", { count: b._count.proofs })}</p>}
            <ProofUpload token={token} />
          </li>
        </ol>
      )}

      <StayPolicies className="rounded-[10px] border border-rule bg-snow p-5" />

      <div className="flex flex-wrap justify-center gap-3">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline">
          <WhatsAppIcon className="h-4 w-4" />
          {t("questions")}
        </a>
        <Link href="/" className="btn-outline">
          {tb("confirmed.home")}
        </Link>
      </div>
    </section>
  );
}
