"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { MAX_NIGHTS_CLIENT } from "@/lib/booking/policy";
import { cn } from "@/lib/utils";

type Range = { checkIn: string; checkOut: string };
type Props = Range & {
  /** first selectable day (YYYY-MM-DD, "today" in Imlil) */
  min: string;
  onChange: (range: Range) => void;
  /** classes of the two trigger cells (check-in, check-out), so each form keeps its own borders */
  cellClass: [string, string];
  labelCls: string;
  valueCls?: string;
  idPrefix?: string;
};

// ── dates as YYYY-MM-DD strings, computed in UTC (no time-zone drift) ──
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};
const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
const addMonths = (iso: string, n: number) => {
  const d = toDate(monthStart(iso));
  d.setUTCMonth(d.getUTCMonth() + n);
  return toISO(d);
};
const nightsBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);

/** 6×7 grid of a month, weeks starting on Monday; days of other months are null. */
function monthGrid(first: string) {
  const d = toDate(first);
  const lead = (d.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 0; i < days; i++) cells.push(addDays(first, i));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function useIsWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

/**
 * Check-in / check-out range picker (replaces the browser's date inputs).
 * Two trigger cells open a calendar: two months side by side on large screens, a bottom sheet with
 * one month on phones. First click sets the arrival, the second the departure (hover previews the stay).
 * Keyboard: arrows move by day/week, Page Up/Down by month, Enter selects, Escape closes.
 */
export function DateRangePicker({ checkIn, checkOut, min, onChange, cellClass, labelCls, valueCls, idPrefix = "" }: Props) {
  const t = useTranslations("datepicker");
  const ts = useTranslations("search");
  const locale = useLocale();
  const intl = locale === "ar" ? "ar-MA" : locale;
  const rtl = locale === "ar";
  const wide = useIsWide();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState(monthStart(checkIn || min));
  const [focus, setFocus] = useState(checkIn || min);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const pop = useRef<HTMLDivElement>(null);

  const fmtCell = useMemo(() => new Intl.DateTimeFormat(intl, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }), [intl]);
  const fmtMonth = useMemo(() => new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" }), [intl]);
  const fmtLong = useMemo(() => new Intl.DateTimeFormat(intl, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), [intl]);
  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(intl, { weekday: "narrow", timeZone: "UTC" });
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2024, 0, 1 + i)))); // 1 Jan 2024 is a Monday
  }, [intl]);

  const maxOut = checkIn ? addDays(checkIn, MAX_NIGHTS_CLIENT) : null;
  const months = wide ? 2 : 1;

  const openAt = (which: "in" | "out") => {
    const p = which === "out" && checkIn ? "out" : "in";
    setPhase(p);
    const start = p === "out" ? checkOut || addDays(checkIn, 1) : checkIn || min;
    setView(monthStart(start));
    setFocus(start);
    setOpen(true);
  };
  const close = useCallback((refocus = true) => {
    setOpen(false);
    setHover(null);
    if (refocus) triggers.current[phase === "out" ? 1 : 0]?.focus();
  }, [phase]);

  // place the popover under the two cells (large screens); phones use a bottom sheet
  useLayoutEffect(() => {
    if (!open || !wide) return;
    const place = () => {
      const rects = triggers.current.filter(Boolean).map((el) => el!.getBoundingClientRect());
      if (!rects.length) return;
      const left = Math.min(...rects.map((r) => r.left));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      const width = Math.min(680, window.innerWidth - 16);
      const x = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const below = bottom + 8;
      const height = pop.current?.offsetHeight ?? 420;
      const top = below + height > window.innerHeight - 8 ? Math.max(8, Math.min(...rects.map((r) => r.top)) - height - 8) : below;
      setPos({ top, left: x, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, wide]);

  // click outside / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node;
      if (pop.current?.contains(el) || triggers.current.some((b) => b?.contains(el))) return;
      close(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // keep the keyboard focus on the focused day
  useEffect(() => {
    if (open) pop.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus({ preventScroll: true });
  }, [open, focus, view]);

  const disabled = (d: string) => d < min || (phase === "out" && !!checkIn && !!maxOut && d > maxOut);

  function pick(d: string) {
    if (disabled(d)) return;
    if (phase === "in" || !checkIn || d <= checkIn) {
      onChange({ checkIn: d, checkOut: "" });
      setPhase("out");
      setFocus(d);
      return;
    }
    onChange({ checkIn, checkOut: d });
    close();
  }

  function onGridKey(e: React.KeyboardEvent) {
    const step: Record<string, number> = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 7, ArrowUp: -7 };
    let next: string | null = null;
    if (e.key in step) next = addDays(focus, step[e.key]);
    else if (e.key === "PageDown") next = addMonths(focus, 1).slice(0, 8) + focus.slice(8);
    else if (e.key === "PageUp") next = addMonths(focus, -1).slice(0, 8) + focus.slice(8);
    else if (e.key === "Home") next = addDays(focus, -((toDate(focus).getUTCDay() + 6) % 7));
    else if (e.key === "End") next = addDays(focus, 6 - ((toDate(focus).getUTCDay() + 6) % 7));
    if (!next) return;
    e.preventDefault();
    // an invalid day (e.g. 31 → 30-day month) falls back to the month's last day
    if (Number.isNaN(toDate(next).getTime()) || toISO(toDate(next)) !== next) next = addDays(monthStart(addMonths(next.slice(0, 7) + "-01", 1)), -1);
    if (next < min) next = min;
    setFocus(next);
    if (next < view) setView(monthStart(next));
    else if (next >= addMonths(view, months)) setView(addMonths(monthStart(next), 1 - months));
  }

  const end = phase === "out" && checkIn && !checkOut && hover && hover > checkIn && !disabled(hover) ? hover : checkOut;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const cell = (d: string | null, i: number) => {
    if (!d) return <span key={`e${i}`} aria-hidden="true" />;
    const off = disabled(d);
    const isStart = d === checkIn;
    const isEnd = !!end && d === end;
    const inRange = !!checkIn && !!end && d > checkIn && d < end;
    const today = d === min;
    return (
      <button
        key={d}
        type="button"
        data-day={d}
        tabIndex={d === focus ? 0 : -1}
        disabled={off}
        aria-pressed={isStart || isEnd}
        aria-label={`${fmtLong.format(toDate(d))}${isStart ? ` · ${ts("checkIn")}` : isEnd ? ` · ${ts("checkOut")}` : ""}`}
        onClick={() => pick(d)}
        onMouseEnter={() => setHover(d)}
        onFocus={() => setHover(d)}
        className={cn(
          "relative grid aspect-square place-items-center text-sm outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-earth",
          inRange && "bg-earth/10",
          isStart && end && end > d && "rounded-s-full bg-earth/10",
          isEnd && checkIn && "rounded-e-full bg-earth/10",
          off ? "cursor-not-allowed text-muted/40 line-through decoration-muted/30" : "cursor-pointer",
        )}
      >
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full",
            (isStart || isEnd) && "bg-earth font-semibold text-snow",
            !off && !isStart && !isEnd && "hover:bg-earth/15",
            today && !isStart && !isEnd && "ring-1 ring-ink/30",
          )}
          dir="ltr"
        >
          {Number(d.slice(8))}
        </span>
      </button>
    );
  };

  const month = (first: string, idx: number) => (
    <div key={first} className="grid content-start gap-2">
      <p className="text-center text-sm font-medium capitalize" aria-live={idx === 0 ? "polite" : undefined}>
        {fmtMonth.format(toDate(first))}
      </p>
      <div className="grid grid-cols-7 text-center text-[11px] uppercase text-granite" aria-hidden="true">
        {weekdays.map((w, i) => (
          <span key={i} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div role="grid" aria-label={fmtMonth.format(toDate(first))} className="grid grid-cols-7 gap-y-1" onKeyDown={onGridKey}>
        {monthGrid(first).map(cell)}
      </div>
    </div>
  );

  const canPrev = view > monthStart(min);
  const panel = (
    <div
      ref={pop}
      role="dialog"
      aria-modal={!wide}
      aria-label={phase === "in" ? t("chooseCheckIn") : t("chooseCheckOut")}
      dir={rtl ? "rtl" : "ltr"}
      style={wide && pos ? { top: pos.top, left: pos.left, width: pos.width } : undefined}
      className={cn(
        "z-[60] grid gap-4 bg-snow p-4 text-ink shadow-[0_24px_60px_-20px_rgba(47,32,22,0.45)]",
        wide ? "fixed rounded-[14px] border border-rule" : "fixed inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[18px] pb-[max(1rem,env(safe-area-inset-bottom))]",
        wide && !pos && "invisible",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{phase === "in" ? t("chooseCheckIn") : t("chooseCheckOut")}</p>
        {!wide && (
          <button type="button" onClick={() => close()} className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper" aria-label={t("close")}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setView(addMonths(view, -1))}
          disabled={!canPrev}
          className="absolute start-0 top-0 grid h-8 w-8 place-items-center rounded-full hover:bg-paper disabled:opacity-30"
          aria-label={t("prev")}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setView(addMonths(view, 1))}
          className="absolute end-0 top-0 grid h-8 w-8 place-items-center rounded-full hover:bg-paper"
          aria-label={t("next")}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </button>
        <div className={cn("grid gap-6", wide && "grid-cols-2")} onMouseLeave={() => setHover(null)}>
          {Array.from({ length: months }, (_, i) => month(addMonths(view, i), i))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3 text-sm">
        <span className="text-muted">{nights > 0 ? ts("nights", { count: nights }) : t("maxNights", { count: MAX_NIGHTS_CLIENT })}</span>
        <span className="flex items-center gap-2">
          {(checkIn || checkOut) && (
            <button
              type="button"
              onClick={() => {
                onChange({ checkIn: "", checkOut: "" });
                setPhase("in");
                setFocus(min);
              }}
              className="rounded-full px-3 py-1.5 text-earth underline-offset-4 hover:underline"
            >
              {t("clear")}
            </button>
          )}
          <button type="button" onClick={() => close()} className="rounded-full bg-ink px-4 py-1.5 text-snow hover:bg-earth">
            {t("done")}
          </button>
        </span>
      </div>
    </div>
  );

  const trigger = (which: 0 | 1) => {
    const value = which === 0 ? checkIn : checkOut;
    const active = open && (phase === "in" ? which === 0 : which === 1);
    return (
      <button
        type="button"
        id={`${idPrefix}${which === 0 ? "checkIn" : "checkOut"}`}
        ref={(el) => {
          triggers.current[which] = el;
        }}
        onClick={() => (open && active ? close() : openAt(which === 0 ? "in" : "out"))}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(cellClass[which], "w-full cursor-pointer text-start transition-colors", active && "bg-earth/5 shadow-[inset_0_-2px_0_0_var(--earth)]")}
      >
        <span className={labelCls}>
          <CalendarDays className="me-1.5 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
          {which === 0 ? ts("checkIn") : ts("checkOut")}
        </span>
        <span className={cn("block truncate text-[15px]", value ? "text-ink" : "text-muted", valueCls)}>{value ? fmtCell.format(toDate(value)) : t("addDate")}</span>
      </button>
    );
  };

  return (
    <>
      {trigger(0)}
      {trigger(1)}
      {open &&
        createPortal(
          <>
            {!wide && <div className="fixed inset-0 z-[59] bg-ink/40" aria-hidden="true" />}
            {panel}
          </>,
          document.body,
        )}
    </>
  );
}
