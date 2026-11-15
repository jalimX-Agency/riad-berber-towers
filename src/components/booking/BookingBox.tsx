"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Loader2, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/rooms";
import { cn } from "@/lib/utils";
import { EXTRA_GUEST_PERCENT } from "@/lib/booking/policy";
import { StayPolicies } from "@/components/booking/StayPolicies";

type Props = { slug: string; basePrice: number; currency: string; maxAdults: number; today: string };

type Quote = {
  available: boolean;
  reason: "booked" | "blocked" | "capacity" | "min_nights" | null;
  minNights: number;
  total: number;
  perNight: number;
  nightly: { date: string; price: number }[];
  extraGuest?: boolean;
};

const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Live price for this room: dates live in the URL so the link can be shared and carried to checkout. */
export function BookingBox({ slug, basePrice, currency, maxAdults, today }: Props) {
  const t = useTranslations("search");
  const tr = useTranslations("rooms");
  const tres = useTranslations("results");
  const tb = useTranslations("book");
  const locale = useLocale();
  const [inDate, setIn] = useState("");
  const [outDate, setOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [synced, setSynced] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const ready = Boolean(inDate && outDate && outDate > inDate);
  const qs = ready ? `checkIn=${inDate}&checkOut=${outDate}&adults=${adults}` : "";

  // Read dates from the URL after mount: the page itself stays static (ISR) and needs no Suspense boundary.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const i = sp.get("checkIn") ?? "";
    const o = sp.get("checkOut") ?? "";
    if (ISO.test(i) && i >= today) {
      setIn(i);
      if (ISO.test(o) && o > i) setOut(o);
    }
    setAdults(Math.min(maxAdults, Math.max(1, Number(sp.get("adults")) || 2)));
    setSynced(true);
  }, [today, maxAdults]);

  useEffect(() => {
    if (!synced) return;
    if (!ready) {
      setQuote(null);
      return;
    }
    // keep the URL in sync without a server round trip
    const url = new URL(window.location.href);
    url.search = qs;
    window.history.replaceState(null, "", url);

    const ctrl = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch(`/api/availability?room=${encodeURIComponent(slug)}&${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setQuote(d.rooms?.[0] ?? null))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        console.error(e);
        setQuote(null);
        setFailed(true);
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [synced, ready, qs, slug]);

  const fmt = (n: number) => formatPrice(n, currency, locale);
  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  const nights = ready ? Math.round((Date.parse(outDate) - Date.parse(inDate)) / 86_400_000) : 0;

  const labelCls = "text-[10px] font-medium uppercase tracking-[0.16em] text-granite [html[dir=rtl]_&]:text-xs [html[dir=rtl]_&]:tracking-normal";
  const inputCls = "w-full bg-transparent text-[15px] text-ink outline-none [color-scheme:light]";

  return (
    <div className="grid gap-4">
      <p>
        <span className="text-sm text-muted">{tr("from")} </span>
        <span className="font-display text-4xl font-semibold" dir="ltr">
          {fmt(basePrice)}
        </span>
        <span className="ms-1.5 text-sm text-muted">{tr("perNight")}</span>
      </p>

      <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-rule">
        <label className="grid gap-0.5 border-e border-b border-rule px-3 py-2">
          <span className={labelCls}>
            <CalendarDays className="me-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
            {t("checkIn")}
          </span>
          <input
            type="date"
            min={today}
            value={inDate}
            onChange={(e) => {
              const v = e.target.value;
              setIn(v);
              if (v && (!outDate || outDate <= v)) setOut(plusDays(v, 1));
            }}
            className={inputCls}
          />
        </label>
        <label className="grid gap-0.5 border-b border-rule px-3 py-2">
          <span className={labelCls}>
            <CalendarDays className="me-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
            {t("checkOut")}
          </span>
          <input type="date" min={inDate ? plusDays(inDate, 1) : plusDays(today, 1)} value={outDate} onChange={(e) => setOut(e.target.value)} className={inputCls} />
        </label>
        <label className="col-span-2 grid gap-0.5 px-3 py-2">
          <span className={labelCls}>
            <Users className="me-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
            {t("guests")}
          </span>
          <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={inputCls}>
            {Array.from({ length: maxAdults }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {t("adults", { count: n })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!ready && <p className="text-sm text-muted">{t("chooseDates")}</p>}

      {ready && loading && !quote && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {tb("checking")}
        </p>
      )}

      {ready && failed && <p className="text-sm text-earth">{tb("errors.server")}</p>}

      {ready && quote && (
        <div className={cn("grid gap-3 transition-opacity", loading && "opacity-50")} aria-live="polite">
          {quote.available ? (
            <>
              <ul className="grid gap-1 text-sm">
                {quote.nightly.map((n) => (
                  <li key={n.date} className="flex justify-between gap-3">
                    <span className="text-muted">{fmtDay(n.date)}</span>
                    <span dir="ltr">{fmt(n.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between border-t border-ink pt-3">
                <span className="text-sm">
                  {t("nights", { count: nights })}, {t("adults", { count: adults })}
                </span>
                <span className="font-display text-3xl font-semibold" dir="ltr">
                  {fmt(quote.total)}
                </span>
              </div>
              {quote.extraGuest && <p className="text-xs text-muted">{tres("extraGuest", { percent: EXTRA_GUEST_PERCENT })}</p>}
              <Link href={`/book?room=${slug}&${qs}`} className="btn-primary justify-center py-4">
                {tres("reserve")}
              </Link>
              <p className="text-center text-xs text-muted">{tb("noPayment")}</p>
            </>
          ) : (
            <>
              <p className="rounded-[8px] border border-earth bg-earth/5 p-3 text-sm text-earth">
                {quote.reason ? tres(`reason.${quote.reason}`, { max: maxAdults, count: quote.minNights }) : tb("errors.unavailable")}
              </p>
              <Link href={`/rooms?${qs}`} className="btn-outline justify-center">
                {tb("seeOtherRooms")}
              </Link>
            </>
          )}
        </div>
      )}

      <StayPolicies className="border-t border-rule pt-4" />
    </div>
  );
}
