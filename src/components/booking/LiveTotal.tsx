"use client";

import { splitPayment } from "@/lib/booking/policy";
import { useExtrasTotal } from "./extras-total";

type Labels = { total: string; room: string; extras: string; deposit: string; balance: string };

/** Total, deposit and balance in the stay summary; follows the activities / transfer chosen in the wizard. */
export function LiveTotal({ roomTotal, currency, locale, labels, note }: { roomTotal: number; currency: string; locale: string; labels: Labels; note?: string }) {
  const extras = useExtrasTotal();
  const total = roomTotal + extras;
  const { deposit, balance } = splitPayment(total);
  const money = (n: number) => new Intl.NumberFormat(locale === "ar" ? "en" : locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="grid gap-3">
      {extras > 0 && (
        <dl className="grid gap-1 border-t border-rule pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{labels.room}</dt>
            <dd dir="ltr">{money(roomTotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{labels.extras}</dt>
            <dd dir="ltr">{money(extras)}</dd>
          </div>
        </dl>
      )}
      <div className="flex items-baseline justify-between border-t border-ink pt-3">
        <span className="font-medium">{labels.total}</span>
        <span className="font-display text-3xl font-semibold transition-colors" dir="ltr" aria-live="polite">
          {money(total)}
        </span>
      </div>
      {note && <p className="-mt-2 text-xs text-muted">{note}</p>}
      <dl className="grid gap-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt>{labels.deposit}</dt>
          <dd className="font-medium" dir="ltr">{money(deposit)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted">
          <dt>{labels.balance}</dt>
          <dd dir="ltr">{money(balance)}</dd>
        </div>
      </dl>
    </div>
  );
}
