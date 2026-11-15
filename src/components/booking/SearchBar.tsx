"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Users, Search } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MAX_GUESTS } from "@/lib/booking/policy";

type Props = {
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  /** today in Imlil, YYYY-MM-DD (passed from the server so SSR and client agree) */
  today: string;
  hasQuery?: boolean;
  className?: string;
  /** open results on another page (e.g. "/rooms" from the home page) instead of the current one */
  target?: "/rooms";
  /** prefix for the field ids when the bar appears more than once on a page */
  idPrefix?: string;
  /** "row": one line from sm up (rooms page). "stacked": dates side by side, guests and button below (narrow columns, home page). */
  layout?: "row" | "stacked";
};

const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Booking-style search bar. Dates live in the URL (?checkIn=&checkOut=&adults=) so results can be shared. */
export function SearchBar({ checkIn, checkOut, adults = 2, today, hasQuery, className, target, idPrefix = "", layout = "row" }: Props) {
  const t = useTranslations("search");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [inDate, setIn] = useState(checkIn ?? "");
  const [outDate, setOut] = useState(checkOut ?? "");
  const [guests, setGuests] = useState(adults);
  const [error, setError] = useState("");

  function onCheckIn(v: string) {
    setIn(v);
    setError("");
    if (v && (!outDate || outDate <= v)) setOut(plusDays(v, 1));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!inDate || !outDate) return setError(t("errors.missing"));
    if (outDate <= inDate) return setError(t("errors.order"));
    setError("");
    const qs = new URLSearchParams({ checkIn: inDate, checkOut: outDate, adults: String(guests) });
    startTransition(() => router.push(`${target ?? pathname}?${qs.toString()}`, { scroll: !!target }));
  }

  const field = "grid min-w-0 gap-0.5 px-4 py-2.5 text-start";
  const labelCls = "text-[10px] font-medium uppercase tracking-[0.16em] text-granite [html[dir=rtl]_&]:text-xs [html[dir=rtl]_&]:tracking-normal";
  const inputCls = "w-full bg-transparent text-[15px] text-ink outline-none [color-scheme:light]";

  return (
    <form onSubmit={submit} className={cn("grid gap-2", className)} noValidate>
      <div
        className={cn(
          "grid overflow-hidden rounded-[12px] border border-rule bg-snow",
          layout === "row" ? "sm:grid-cols-[1.2fr_1.2fr_1fr_auto]" : "grid-cols-2",
          error && "border-earth",
        )}
      >
        <label className={cn(field, layout === "row" ? "border-b border-rule sm:border-b-0 sm:border-e" : "border-e border-b border-rule")}>
          <span className={labelCls}>
            <CalendarDays className="me-1.5 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
            {t("checkIn")}
          </span>
          <input id={`${idPrefix}checkIn`} type="date" min={today} value={inDate} onChange={(e) => onCheckIn(e.target.value)} className={inputCls} required />
        </label>
        <label className={cn(field, layout === "row" ? "border-b border-rule sm:border-b-0 sm:border-e" : "border-b border-rule")}>
          <span className={labelCls}>
            <CalendarDays className="me-1.5 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
            {t("checkOut")}
          </span>
          <input
            id={`${idPrefix}checkOut`}
            type="date"
            min={inDate ? plusDays(inDate, 1) : plusDays(today, 1)}
            value={outDate}
            onChange={(e) => {
              setOut(e.target.value);
              setError("");
            }}
            className={inputCls}
            required
          />
        </label>
        <label className={cn(field, layout === "row" ? "border-b border-rule sm:border-b-0 sm:border-e" : "col-span-2 border-b border-rule")}>
          <span className={labelCls}>
            <Users className="me-1.5 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
            {t("guests")}
          </span>
          <select id={`${idPrefix}adults`} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={inputCls}>
            {Array.from({ length: MAX_GUESTS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {t("adults", { count: n })}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className={cn("inline-flex items-center justify-center gap-2 bg-earth px-7 py-4 text-xs font-medium uppercase tracking-[0.14em] text-snow transition-colors hover:bg-ink disabled:opacity-70", layout === "stacked" && "col-span-2")}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {hasQuery ? t("update") : t("search")}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-earth">
          {error}
        </p>
      )}
    </form>
  );
}
