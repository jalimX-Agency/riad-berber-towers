import { useTranslations } from "next-intl";
import { Banknote, Baby, CalendarCheck, FileHeart, PartyPopper, PawPrint, Users, WineOff } from "lucide-react";
import { CASH_CURRENCIES, DEPOSIT_PERCENT, EXTRA_GUEST_PERCENT, STANDARD_OCCUPANCY } from "@/lib/booking/policy";
import { cn } from "@/lib/utils";

/**
 * The house rules a guest must know before booking (owner, Nov 2026): children under 12, pets, parties, alcohol,
 * marriage certificate for Moroccan and Arab couples, guests per room, the advance and the balance.
 * Works in server and client components.
 */
export function StayPolicies({ className, title = true }: { className?: string; title?: boolean }) {
  const t = useTranslations("policy");
  const items = [
    { icon: Baby, text: t("adultsOnly") },
    { icon: PawPrint, text: t("noPets") },
    { icon: PartyPopper, text: t("noParties") },
    { icon: WineOff, text: t("noAlcohol") },
    { icon: FileHeart, text: t("marriage") },
    { icon: Users, text: t("guests", { max: STANDARD_OCCUPANCY, percent: EXTRA_GUEST_PERCENT }) },
    { icon: CalendarCheck, text: t("deposit", { percent: DEPOSIT_PERCENT }) },
    { icon: Banknote, text: t("balance", { currencies: CASH_CURRENCIES.join(", ") }) },
  ];
  return (
    <div className={cn("grid gap-2", className)}>
      {title && <p className="label">{t("title")}</p>}
      <ul className="grid gap-2 text-sm">
        {items.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-2.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-earth" aria-hidden="true" strokeWidth={1.5} />
            <span className="text-muted">{text}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">{t("respect")}</p>
    </div>
  );
}
