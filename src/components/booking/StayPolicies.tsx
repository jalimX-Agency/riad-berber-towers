import { useTranslations } from "next-intl";
import { CASH_CURRENCIES, DEPOSIT_PERCENT, EXTRA_GUEST_PERCENT, MAX_GUESTS, STANDARD_OCCUPANCY } from "@/lib/booking/policy";
import { cn } from "@/lib/utils";

/**
 * "Good to know – house rules" (owner wording, Nov 2026): children under 12, pets, parties, alcohol,
 * marriage certificate for Moroccan and Arab couples, room occupancy, deposit and payment.
 * Works in server and client components. Emojis live here only: the PDF voucher and the emails reuse the
 * same texts without them (the PDF fonts can't draw emojis).
 */
export function StayPolicies({ className, title = true }: { className?: string; title?: boolean }) {
  const t = useTranslations("policy");
  const items = [
    { emoji: "👶", label: t("label.children"), text: t("adultsOnly") },
    { emoji: "🐾", label: t("label.pets"), text: t("noPets") },
    { emoji: "🎉", label: t("label.parties"), text: t("noParties") },
    { emoji: "🍷", label: t("label.alcohol"), text: t("noAlcohol") },
    { emoji: "💍", label: t("label.marriage"), text: t("marriage") },
    { emoji: "🛏️", label: t("label.occupancy"), text: t("guests", { max: STANDARD_OCCUPANCY, total: MAX_GUESTS, percent: EXTRA_GUEST_PERCENT }) },
    { emoji: "💳", label: t("label.deposit"), text: t("deposit", { percent: DEPOSIT_PERCENT }) },
    { emoji: "💵", label: t("label.payment"), text: t("balance", { currencies: CASH_CURRENCIES.join(", ") }) },
  ];
  return (
    <div className={cn("grid gap-2", className)}>
      {title && <p className="label">{t("title")}</p>}
      <p className="text-sm text-ink">{t("intro")}</p>
      <ul className="grid gap-2.5 text-sm">
        {items.map(({ emoji, label, text }) => (
          <li key={label} className="flex gap-2.5">
            <span className="w-5 shrink-0 text-center leading-5" aria-hidden="true">{emoji}</span>
            <span className="text-muted">
              <strong className="font-medium text-ink">{label}:</strong> {text}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">🙏 {t("respect")}</p>
    </div>
  );
}
