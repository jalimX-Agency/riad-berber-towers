"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BookingSource, BookingStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Phone, RefreshCw, TriangleAlert } from "lucide-react";
import type { CalBlock, CalBooking, CalendarData, CalRoom } from "@/lib/admin/control-calendar";
import { applyChanges, reopenBlock, syncNow } from "@/app/admin/(protected)/calendar/actions";
import { bedLabel, paymentLabel, sourceLabel } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";
import { ActionDrawer, type Selection } from "./ActionDrawer";
import { toast as notify } from "@/components/admin/Toaster";
import { ChannelMark, PLATFORM_COLORS, PlatformIcon } from "./PlatformIcon";
import { MobileAgenda } from "./MobileAgenda";

const statusBar: Partial<Record<BookingStatus, string>> = {
  PENDING: "bg-amber-300 text-amber-950",
  AWAITING_PAYMENT: "bg-orange-300 text-orange-950",
  PAYMENT_REVIEW: "bg-violet-400 text-white",
  CONFIRMED: "bg-emerald-600 text-white",
  CHECKED_IN: "bg-sky-600 text-white",
  CHECKED_OUT: "bg-stone-400 text-white",
};
const statusName: Partial<Record<BookingStatus, string>> = {
  PENDING: "Demande",
  AWAITING_PAYMENT: "Attente paiement",
  PAYMENT_REVIEW: "Preuve à vérifier",
  CONFIRMED: "Confirmée",
  CHECKED_IN: "Sur place",
  CHECKED_OUT: "Partie",
};

type Filter = "all" | "airbnb" | "booking" | "direct";
type PriceKey = "site" | "booking" | "airbnb" | "min";
type Editing = { roomId: string; iso: string; k: PriceKey; d: number };
const editLimits: Record<PriceKey, [number, number]> = { site: [10, 10_000], booking: [20, 5000], airbnb: [100, 50_000], min: [1, 30] };
type Layers = { site: boolean; booking: boolean; airbnb: boolean; min: boolean };
const DEFAULT_LAYERS: Layers = { site: true, booking: true, airbnb: true, min: false };

const DAY = 86_400_000;
const idx = (from: string, iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
const groupOf = (s: BookingSource): Filter => (s === "AIRBNB" ? "airbnb" : s === "BOOKING_COM" ? "booking" : "direct");
const nf = new Intl.NumberFormat("fr-FR");
const when = (iso?: string) => (iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(iso)) : "jamais");

export function ControlCalendar({
  data,
  canEdit,
  today,
  view,
  pageUrl,
}: {
  data: CalendarData;
  canEdit: boolean;
  today: string;
  view: number;
  /** current page URL without the booking panel param (bars open the panel over it) */
  pageUrl: string;
}) {
  const router = useRouter();
  const n = data.days.length;
  const [filter, setFilter] = useState<Filter>("all");
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS);
  const [onlyRoom, setOnlyRoom] = useState<string>("all");
  const [sel, setSel] = useState<{ a: { r: number; d: number }; b: { r: number; d: number } } | null>(null);
  const dragging = useRef(false);
  /** which row the press started on: a single click on a price cell edits it in place instead of opening the drawer */
  const pressKind = useRef<PriceKey | "bookings">("bookings");
  const [editing, setEditing] = useState<Editing | null>(null);
  /** values just typed, shown until the refreshed data arrives */
  const [pending, setPending] = useState<Record<string, number>>({});
  useEffect(() => setPending({}), [data]);
  const [hover, setHover] = useState<{ r: number; d: number } | null>(null);
  const [card, setCard] = useState<{ b: CalBooking; x: number; y: number } | null>(null);
  const [compact, setCompact] = useState(false);
  // the grid scrolls inside its own box (dates and room names stay visible); arrows and the wheel move it sideways
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 });
  }, []);
  const slide = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const col = (el.querySelector("[data-day]") as HTMLElement | null)?.offsetWidth ?? 90;
    el.scrollBy({ left: dir * col * 7, behavior: "smooth" });
  };
  // the box takes the rest of the screen below the toolbar, so its sideways scrollbar is always in view
  const [boxHeight, setBoxHeight] = useState<string>("calc(100dvh - 260px)");
  useEffect(() => {
    const fit = () => {
      const el = scroller.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setBoxHeight(`calc(100dvh - ${Math.round(Math.min(top, window.innerHeight * 0.45))}px - 16px)`);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [data.beds24Error]);
  // open on today (first visible column after the room names)
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const cell = el.querySelector(`[data-day="${today}"]`) as HTMLElement | null;
    const label = (el.querySelector("[data-corner]") as HTMLElement | null)?.offsetWidth ?? 0;
    if (cell) el.scrollLeft = Math.max(0, cell.offsetLeft - label - cell.offsetWidth);
    updateEdges();
  }, [today, data.from, updateEdges]);
  // a plain mouse wheel over the dates row scrolls the days sideways (native listener: it must cancel the vertical scroll)
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (!(e.target as HTMLElement).closest("[data-day]")) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const [drawer, setDrawer] = useState<Selection | null>(null);
  const [blockMenu, setBlockMenu] = useState<CalBlock | null>(null);
  // every result shows as a toast in the corner of the screen (components/admin/Toaster.tsx)
  const setToast = (m: { ok: boolean; text: string } | null) => {
    if (m) notify(m.ok ? "success" : "error", m.text);
  };
  const [syncing, startSync] = useTransition();
  const [reopening, startReopen] = useTransition();

  // per-viewer conveniences
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rbt-cal-layers");
      if (saved) setLayers({ ...DEFAULT_LAYERS, ...JSON.parse(saved) });
      setCompact(localStorage.getItem("rbt-cal-compact") === "1");
    } catch {}
  }, []);
  const toggleCompact = () =>
    setCompact((c) => {
      try {
        localStorage.setItem("rbt-cal-compact", c ? "0" : "1");
      } catch {}
      return !c;
    });
  const toggleLayer = (k: keyof Layers) =>
    setLayers((l) => {
      const next = { ...l, [k]: !l[k] };
      try {
        localStorage.setItem("rbt-cal-layers", JSON.stringify(next));
      } catch {}
      return next;
    });

  const rooms = onlyRoom === "all" ? data.rooms : data.rooms.filter((r) => r.id === onlyRoom);
  const priceRows = compact ? [] : (["site", "booking", "airbnb", "min"] as const).filter((k) => layers[k]);

  // nights already sold or closed, for dimming prices and the occupancy row
  const taken = useMemo(() => {
    const m = new Map<string, Set<number>>();
    const mark = (roomId: string, s: string, e: string) => {
      const set = m.get(roomId) ?? new Set<number>();
      for (let i = Math.max(0, idx(data.from, s)); i < Math.min(n, idx(data.from, e)); i++) set.add(i);
      m.set(roomId, set);
    };
    for (const b of data.bookings) mark(b.roomId, b.checkIn, b.checkOut);
    for (const k of data.blocks) mark(k.roomId, k.start, k.end);
    return m;
  }, [data, n]);

  // overlapping stays / closures: ids for the red rings, and readable pairs for the banner (phone included)
  const { clashes, clashPairs } = useMemo(() => {
    const out = new Set<string>();
    type Item = { id: string; roomId: string; s: string; e: string; label: string; bookingId?: string };
    const items: Item[] = [
      ...data.bookings.map((b) => ({ id: b.id, roomId: b.roomId, s: b.checkIn, e: b.checkOut, bookingId: b.id, label: `${b.guest || "Sans nom"} (${b.ota ? (b.source === "AIRBNB" ? "Airbnb" : "Booking.com") : b.reference})` })),
      ...data.blocks.map((k) => ({ id: k.id, roomId: k.roomId, s: k.start, e: k.end, label: k.kind === "maintenance" ? "Travaux" : k.kind === "beds24" ? "Fermée dans Beds24" : `Fermée${k.reason ? ` · ${k.reason}` : ""}` })),
    ];
    const pairs: { room: string; a: Item; b: Item; from: string; to: string }[] = [];
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const x = items[i];
        const y = items[j];
        // two closures on the same nights sell nothing twice: only pairs with a stay are conflicts
        if (x.roomId === y.roomId && x.s < y.e && y.s < x.e && (x.bookingId || y.bookingId)) {
          out.add(x.id).add(y.id);
          pairs.push({ room: data.rooms.find((r) => r.id === x.roomId)?.short ?? "", a: x, b: y, from: x.s > y.s ? x.s : y.s, to: x.e < y.e ? x.e : y.e });
        }
      }
    return { clashes: out, clashPairs: pairs };
  }, [data]);
  const shortDay = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)).replace(".", "");
  const bookingHref = (id: string) => `${pageUrl}${pageUrl.includes("?") ? "&" : "?"}b=${encodeURIComponent(id)}`;

  // ── selection (drag across nights and rooms) ──
  const finish = useCallback(() => {
    if (!dragging.current || !sel) return;
    dragging.current = false;
    if (sel.a.r === sel.b.r && sel.a.d === sel.b.d && pressKind.current !== "bookings") {
      const room = rooms[sel.a.r];
      setSel(null);
      if (room && (pressKind.current === "site" || pressKind.current === "min" || room.beds24)) setEditing({ roomId: room.id, iso: data.days[sel.a.d], k: pressKind.current, d: sel.a.d });
      return;
    }
    const r0 = Math.min(sel.a.r, sel.b.r);
    const r1 = Math.max(sel.a.r, sel.b.r);
    const d0 = Math.min(sel.a.d, sel.b.d);
    const d1 = Math.max(sel.a.d, sel.b.d);
    setDrawer({ roomIds: rooms.slice(r0, r1 + 1).map((r) => r.id), from: data.days[d0], to: data.days[d1] });
  }, [sel, rooms, data.days]);
  useEffect(() => {
    window.addEventListener("pointerup", finish);
    return () => window.removeEventListener("pointerup", finish);
  }, [finish]);
  const inSel = (r: number, d: number) => {
    if (!sel) return false;
    return r >= Math.min(sel.a.r, sel.b.r) && r <= Math.max(sel.a.r, sel.b.r) && d >= Math.min(sel.a.d, sel.b.d) && d <= Math.max(sel.a.d, sel.b.d);
  };
  const cellHandlers = (r: number, d: number, kind: PriceKey | "bookings" = "bookings") =>
    canEdit
      ? {
          onPointerDown: (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            e.preventDefault();
            (e.target as Element).releasePointerCapture?.(e.pointerId);
            dragging.current = true;
            pressKind.current = kind;
            // a price being typed is saved before moving on (preventDefault above keeps the focus, so blur it ourselves)
            (document.activeElement as HTMLElement | null)?.blur?.();
            setEditing(null);
            setSel({ a: { r, d }, b: { r, d } });
          },
          onPointerEnter: () => {
            setHover({ r, d });
            if (dragging.current) setSel((s) => (s ? { ...s, b: { r, d } } : s));
          },
        }
      : { onPointerEnter: () => setHover({ r, d }) };

  // ── in-place price editing ──
  const pendingKey = (roomId: string, iso: string, k: PriceKey) => `${roomId}|${iso}|${k}`;
  const currentValue = (room: CalRoom, d: number, k: PriceKey): number | null => {
    const night = data.nights[room.id]?.[d];
    if (!night) return null;
    if (k === "site") return night.site;
    if (k === "min") return Math.max(night.minNights, night.channelMin ?? 1);
    return night[k];
  };
  const saveCell = (room: CalRoom, ed: Editing, raw: string, next?: 1 | -1) => {
    const move = () => {
      const nd = ed.d + (next ?? 0);
      setEditing(next && nd >= 0 && nd < n ? { ...ed, d: nd, iso: data.days[nd] } : null);
    };
    const value = Number(raw.replace(",", "."));
    const before = currentValue(room, ed.d, ed.k);
    if (!raw.trim() || !Number.isFinite(value) || value === before) return move();
    const [lo, hi] = editLimits[ed.k];
    if (value < lo || value > hi) {
      setToast({ ok: false, text: `Valeur refusée : entre ${nf.format(lo)} et ${nf.format(hi)}.` });
      return;
    }
    const key = pendingKey(room.id, ed.iso, ed.k);
    setPending((p) => ({ ...p, [key]: value }));
    move();
    const base = { rooms: [room.id], from: ed.iso, to: ed.iso };
    const input =
      ed.k === "site"
        ? { ...base, site: value }
        : ed.k === "min"
          ? { ...base, minStay: Math.round(value) }
          : ed.k === "booking"
            ? { ...base, booking: value, ...(before == null ? { bookingState: "open" as const } : {}) }
            : { ...base, airbnb: value, ...(before == null ? { airbnbState: "open" as const } : {}) };
    applyChanges(input)
      .then((r) => {
        if (!r.ok) {
          setPending((p) => {
            const { [key]: _drop, ...rest } = p;
            void _drop;
            return rest;
          });
          setToast({ ok: false, text: r.error });
        }
        router.refresh();
      })
      .catch(() => setToast({ ok: false, text: "Enregistrement impossible : vérifiez la connexion." }));
  };

  const closeDrawer = () => {
    setDrawer(null);
    setSel(null);
  };
  const done = (text: string, ok: boolean) => {
    closeDrawer();
    setToast({ ok, text });
    router.refresh();
  };

  // ── navigation ──
  const shift = (days: number) => {
    const d = new Date(`${data.from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const href = (start: string, v = view) => `/admin/calendar?start=${start}&view=${v}`;
  const rangeTitle = `${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${data.from}T00:00:00Z`))} – ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${data.days[n - 1]}T00:00:00Z`))}`;

  const grid = { gridTemplateColumns: `minmax(140px, 180px) repeat(${n}, minmax(${view > 20 ? 84 : 104}px, 1fr))` };
  const rowsPerRoom = 1 + priceRows.length;

  const bar = (b: CalBooking) => {
    if (b.source === "AIRBNB" || b.source === "BOOKING_COM") {
      const c = PLATFORM_COLORS[b.source];
      return { className: "", style: { backgroundColor: c.bg, color: c.fg } };
    }
    return { className: statusBar[b.status] ?? "bg-stone-300", style: {} };
  };

  return (
    <div className="grid min-w-0 gap-4">
      {/* toolbar */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Centre de contrôle · site, Booking.com, Airbnb</p>
          <h1 className="text-2xl sm:text-4xl">{rangeTitle}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href(shift(-view))} className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-snow hover:border-earth" aria-label="Période précédente">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href={href(today)} className="rounded-full border border-rule bg-snow px-4 py-1.5 text-sm hover:border-earth">
            Aujourd’hui
          </Link>
          <Link href={href(shift(view))} className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-snow hover:border-earth" aria-label="Période suivante">
            <ChevronRight className="h-4 w-4" />
          </Link>
          <input
            type="date"
            aria-label="Aller à la date"
            className="rounded-full border border-rule bg-snow px-3 py-1.5 text-sm"
            onChange={(e) => e.target.value && router.push(href(e.target.value))}
          />
          <div className="hidden overflow-hidden rounded-full border border-rule bg-snow text-sm sm:flex">
            {[14, 31].map((v) => (
              <Link key={v} href={href(data.from, v)} className={cn("px-3 py-1.5", v === view ? "bg-ink text-snow" : "hover:bg-paper")}>
                {v} j
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-rule bg-snow px-3 py-3 text-sm sm:px-4">
        <div className="-mx-1 flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto px-1 sm:flex-wrap">
          {(
            [
              ["all", "Toutes"],
              ["airbnb", "Airbnb"],
              ["booking", "Booking.com"],
              ["direct", "Site et direct"],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1", filter === k ? "border-ink bg-ink text-snow" : "border-rule hover:border-earth")}
            >
              {k === "airbnb" && <PlatformIcon source="AIRBNB" />}
              {k === "booking" && <PlatformIcon source="BOOKING_COM" />}
              {k === "direct" && <PlatformIcon source="WEBSITE" />}
              {label}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-rule sm:inline-block" />
          <button
            type="button"
            onClick={toggleCompact}
            aria-pressed={compact}
            className={cn("hidden shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 sm:inline-flex", compact ? "border-ink bg-ink text-snow" : "border-rule hover:border-earth")}
            title="Afficher seulement les réservations, toutes les chambres sur un écran"
          >
            {compact ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
            {compact ? "Afficher les prix" : "Masquer les prix"}
          </button>
          {!compact && (
            [
              ["site", "Prix site"],
              ["booking", "Prix Booking"],
              ["airbnb", "Prix Airbnb"],
              ["min", "Séjour min."],
            ] as [keyof Layers, string][]
          ).map(([k, label]) => (
            <label key={k} className="hidden cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 hover:bg-paper sm:flex">
              <input type="checkbox" checked={layers[k]} onChange={() => toggleLayer(k)} className="accent-[var(--earth)]" />
              {label}
            </label>
          ))}
          <select value={onlyRoom} onChange={(e) => setOnlyRoom(e.target.value)} className="hidden rounded-full border border-rule bg-snow px-3 py-1 sm:block" aria-label="Chambre affichée">
            <option value="all">Toutes les chambres</option>
            {data.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span suppressHydrationWarning className={cn("text-xs", data.sync && !data.sync.ok ? "text-rose-800" : "text-muted")}>Beds24 : {when(data.sync?.at)}</span>
          <button
            type="button"
            disabled={syncing}
            onClick={() =>
              startSync(async () => {
                const r = await syncNow();
                setToast({ ok: r.ok, text: r.ok ? r.message : r.error });
                router.refresh();
              })
            }
            className="inline-flex items-center gap-2 rounded-full border border-ink px-3 py-1.5 text-sm hover:border-earth hover:text-earth disabled:opacity-60"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Synchroniser
          </button>
        </div>
      </div>

      {data.beds24Error && (
        <p role="alert" className="flex items-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {data.beds24Error}
        </p>
      )}
      {clashPairs.length > 0 && (
        <div role="alert" className="grid gap-2 rounded-[10px] border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            Conflit : {clashPairs.length > 1 ? `${clashPairs.length} chevauchements` : "un chevauchement"} sur les mêmes nuits. Vérifiez avant de vendre ces nuits.
          </p>
          <ul className="grid gap-1.5 ps-6">
            {clashPairs.slice(0, 8).map((c) => (
              <li key={`${c.a.id}-${c.b.id}`} className="leading-snug">
                <b>{c.room}</b> · nuits du {shortDay(c.from)} au {shortDay(c.to)} (départ) :{" "}
                {[c.a, c.b].map((it, i) => (
                  <span key={it.id}>
                    {i === 1 && " et "}
                    {it.bookingId ? (
                      <Link href={bookingHref(it.bookingId)} scroll={false} prefetch={false} className="underline underline-offset-2 hover:text-rose-700">
                        {it.label}
                      </Link>
                    ) : (
                      <span>{it.label}</span>
                    )}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          <p className="ps-6 text-xs text-rose-800">
            Une fermeture en trop se rouvre depuis le calendrier ; une réservation annulée sur la plateforme disparaît après « Synchroniser ».
          </p>
        </div>
      )}

      <MobileAgenda data={data} canEdit={canEdit} today={today} filter={filter} pageUrl={pageUrl} onEdit={setDrawer} onBlock={setBlockMenu} />

      {/* grid (tablet and desktop) */}
      <div className="relative hidden min-w-0 sm:block">
      <div
        ref={scroller}
        onScroll={updateEdges}
        style={{ maxHeight: boxHeight }}
        className="min-h-[420px] overflow-auto overscroll-contain rounded-[12px] border border-rule bg-snow"
      >
        <div className={cn("grid select-none text-[13px]", view > 20 ? "min-w-[2800px]" : "min-w-[1600px]")} style={grid} onPointerLeave={() => setHover(null)}>
          <div data-corner className="sticky start-0 top-0 z-40 border-b border-e border-rule bg-snow p-2 font-medium">Chambre</div>
          {data.days.map((iso, d) => {
            const dt = new Date(`${iso}T00:00:00Z`);
            const wd = dt.getUTCDay();
            return (
              <div key={iso} data-day={iso} className={cn("sticky top-0 z-30 grid cursor-ew-resize place-items-center border-b border-rule bg-snow py-2 text-center", (wd === 0 || wd === 6) && "bg-paper", hover?.d === d && "bg-paper text-earth shadow-[inset_0_-3px_0_var(--earth)]", iso === today && "bg-earth text-snow")} style={{ gridColumn: d + 2 }}>
                <span className="uppercase opacity-70">{new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(dt).replace(".", "")}</span>
                <span className="text-base font-medium">{dt.getUTCDate()}</span>
              </div>
            );
          })}

          {rooms.map((room, r) => {
            const base = 2 + r * rowsPerRoom;
            const nights = data.nights[room.id] ?? [];
            const used = taken.get(room.id) ?? new Set<number>();
            const bookings = data.bookings.filter((b) => b.roomId === room.id && (filter === "all" || groupOf(b.source) === filter));
            const blocks = filter === "all" || filter === "direct" ? data.blocks.filter((k) => k.roomId === room.id) : [];
            return (
              <div key={room.id} className="contents">
                {/* labels: room name on the bookings row, one label per price row */}
                <div className={cn("sticky start-0 z-20 flex h-16 items-center border-e border-rule bg-snow px-2 text-sm font-medium", priceRows.length === 0 && "border-b", hover?.r === r && "text-earth shadow-[inset_3px_0_0_var(--earth)]")} style={{ gridRow: base, gridColumn: 1 }}>
                  {room.short}
                </div>
                {priceRows.map((k, j) => (
                  <div
                    key={`label-${k}`}
                    style={{ gridRow: base + 1 + j, gridColumn: 1 }}
                    className={cn("sticky start-0 z-20 flex h-8 items-center gap-1.5 border-e border-rule bg-snow px-2 text-xs text-muted", j === priceRows.length - 1 && "border-b")}
                  >
                    {k === "min" ? <span className="w-3.5 text-center">↔</span> : <ChannelMark channel={k} className="h-3.5 w-3.5" />}
                    {k === "site" ? "Site €" : k === "booking" ? "Booking €" : k === "airbnb" ? "Airbnb DH" : "Séjour min."}
                  </div>
                ))}

                {/* bookings row: background cells (selection) */}
                {data.days.map((iso, d) => {
                  const wd = new Date(`${iso}T00:00:00Z`).getUTCDay();
                  return (
                    <div
                      key={`bg-${iso}`}
                      {...cellHandlers(r, d)}
                      style={{ gridRow: base, gridColumn: d + 2 }}
                      className={cn("h-16 border-e border-rule/50", (wd === 0 || wd === 6) && "bg-paper/40", inSel(r, d) && "bg-earth/20", canEdit && "cursor-cell")}
                    />
                  );
                })}
                {blocks.map((k) => {
                  const s = Math.max(0, idx(data.from, k.start));
                  const e = Math.min(n, idx(data.from, k.end));
                  if (e <= s) return null;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setBlockMenu(k)}
                      style={{ gridRow: base, gridColumn: `${s + 2} / ${e + 2}`, backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,.09) 0 6px, transparent 6px 12px)" }}
                      className={cn("z-10 my-2 truncate rounded-[8px] bg-stone-200 px-2 text-start text-stone-800", clashes.has(k.id) && "ring-2 ring-rose-600")}
                      title={k.reason || "Fermée"}
                    >
                      {k.kind === "maintenance" ? "Travaux" : k.kind === "beds24" ? "Fermée" : k.reason || "Fermée"}
                    </button>
                  );
                })}
                {bookings.map((b) => {
                  const s = Math.max(0, idx(data.from, b.checkIn));
                  const e = Math.min(n, idx(data.from, b.checkOut));
                  if (e <= s) return null;
                  const look = bar(b);
                  return (
                    <Link
                      key={b.id}
                      prefetch={false}
                      scroll={false}
                      href={`${pageUrl}${pageUrl.includes("?") ? "&" : "?"}b=${encodeURIComponent(b.id)}`}
                      style={{ gridRow: base, gridColumn: `${s + 2} / ${e + 2}`, ...look.style }}
                      className={cn("z-10 my-1.5 flex min-w-0 items-center gap-2 rounded-[8px] px-2 shadow-sm hover:brightness-95", look.className, clashes.has(b.id) && "ring-2 ring-rose-600")}
                      onPointerEnter={(ev) => setCard({ b, x: ev.clientX, y: ev.clientY })}
                      onPointerMove={(ev) => setCard((c) => (c && c.b.id === b.id ? { ...c, x: ev.clientX, y: ev.clientY } : c))}
                      onPointerLeave={() => setCard(null)}
                      onClick={() => setCard(null)}
                    >
                      <PlatformIcon source={b.source} className="h-5 w-5 shrink-0 rounded-[4px] ring-1 ring-white/60" />
                      {/* two lines: guest, then nights and departure, so short stays stay readable */}
                      <span className="grid min-w-0 leading-tight">
                        <span className="truncate text-sm font-semibold">{b.guest}</span>
                        <span className="truncate text-xs opacity-85">
                          {b.nights} n. · {b.adults} pers. · → {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${b.checkOut}T00:00:00Z`)).replace(".", "")}
                        </span>
                      </span>
                    </Link>
                  );
                })}

                {/* price rows: one click on a price edits it in place (Enter or Tab saves, Échap cancels) */}
                {priceRows.map((k, j) =>
                  data.days.map((iso, d) => {
                    const night = nights[d];
                    const sold = used.has(d);
                    const waiting = pending[pendingKey(room.id, iso, k)];
                    let text = "";
                    let tone = "";
                    if (k === "site") {
                      text = night ? nf.format(night.site) : "";
                      tone = night?.siteCustom ? "font-semibold text-ink" : "text-muted";
                    } else if (k === "booking" || k === "airbnb") {
                      const v = room.beds24 ? night?.[k] : null;
                      text = v == null ? (data.beds24Error ? "–" : "×") : nf.format(v);
                      tone = v == null && !data.beds24Error ? "text-rose-700" : "text-ink";
                    } else {
                      const m = Math.max(night?.minNights ?? 1, night?.channelMin ?? 1);
                      text = m > 1 ? String(m) : "";
                      tone = "text-muted";
                    }
                    if (waiting != null) {
                      text = nf.format(waiting);
                      tone = "font-semibold text-earth animate-pulse";
                    }
                    const isEditing = editing?.roomId === room.id && editing.d === d && editing.k === k;
                    const editable = canEdit && (k === "site" || k === "min" || room.beds24);
                    return (
                      <div
                        key={`${k}-${iso}`}
                        {...cellHandlers(r, d, k)}
                        style={{ gridRow: base + 1 + j, gridColumn: d + 2 }}
                        title={isEditing ? undefined : text === "×" ? "Fermée sur cette plateforme : tapez un prix pour la rouvrir" : editable ? "Cliquez pour modifier" : undefined}
                        className={cn(
                          "flex h-8 items-center justify-end border-e border-rule/40 px-2 tabular-nums",
                          j === priceRows.length - 1 && "border-b border-b-rule",
                          sold && !isEditing && waiting == null && "opacity-40",
                          inSel(r, d) && "bg-earth/20",
                          editable && "cursor-text hover:bg-earth/10 hover:ring-1 hover:ring-inset hover:ring-earth/40",
                          isEditing && "relative z-20 p-0",
                          tone,
                        )}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            inputMode="decimal"
                            defaultValue={waiting ?? currentValue(room, d, k) ?? ""}
                            aria-label={`Nouveau prix ${k} ${iso}`}
                            onFocus={(e) => e.currentTarget.select()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              const el = e.currentTarget;
                              if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault();
                                el.dataset.done = "1";
                                saveCell(room, editing, el.value, e.key === "Tab" ? (e.shiftKey ? -1 : 1) : undefined);
                              } else if (e.key === "Escape") {
                                el.dataset.done = "1";
                                setEditing(null);
                              }
                            }}
                            onBlur={(e) => {
                              // a click elsewhere saves too (Enter, Tab and Échap are handled above)
                              if (e.currentTarget.dataset.done) return;
                              e.currentTarget.dataset.done = "1";
                              saveCell(room, editing, e.currentTarget.value);
                            }}
                            className="h-full w-full rounded-[4px] border-2 border-earth bg-snow px-1.5 text-end font-semibold text-ink outline-none"
                          />
                        ) : (
                          text
                        )}
                      </div>
                    );
                  }),
                )}
                {priceRows.length === 0 && <div style={{ gridRow: base, gridColumn: `2 / ${n + 2}` }} className="pointer-events-none border-b border-rule" />}
              </div>
            );
          })}

          {/* today: a line down every room */}
          {data.days.indexOf(today) >= 0 && (
            <div
              aria-hidden="true"
              style={{ gridColumn: data.days.indexOf(today) + 2, gridRow: `2 / ${2 + rooms.length * rowsPerRoom}` }}
              className="pointer-events-none z-[11] border-x-2 border-earth/70 bg-earth/[0.05]"
            />
          )}
          {/* hover: the day column and the room's rows, to read a price against its date and room */}
          {hover && (
            <>
              <div aria-hidden="true" style={{ gridColumn: hover.d + 2, gridRow: `2 / ${2 + rooms.length * rowsPerRoom}` }} className="pointer-events-none z-[9] bg-ink/[0.045]" />
              <div aria-hidden="true" style={{ gridColumn: `2 / ${n + 2}`, gridRow: `${2 + hover.r * rowsPerRoom} / ${2 + (hover.r + 1) * rowsPerRoom}` }} className="pointer-events-none z-[9] bg-ink/[0.03]" />
            </>
          )}

          {/* occupancy */}
          <div style={{ gridRow: 2 + rooms.length * rowsPerRoom, gridColumn: 1 }} className="sticky bottom-0 start-0 z-30 border-e border-t border-rule bg-snow p-2 text-muted">
            Occupation
          </div>
          {data.days.map((iso, d) => {
            const count = data.rooms.filter((rm) => taken.get(rm.id)?.has(d)).length;
            return (
              <div key={`occ-${iso}`} style={{ gridRow: 2 + rooms.length * rowsPerRoom, gridColumn: d + 2 }} className={cn("sticky bottom-0 z-20 border-t border-rule bg-snow py-2 text-center", count === data.rooms.length ? "font-semibold text-earth" : "text-muted")}>
                {count}/{data.rooms.length}
              </div>
            );
          })}
        </div>
      </div>
      {/* arrows: one week back / forward inside the loaded dates */}
      {(["start", "end"] as const).map((side) => (
        <button
          key={side}
          type="button"
          onClick={() => slide(side === "start" ? -1 : 1)}
          disabled={edges[side]}
          aria-label={side === "start" ? "Jours précédents" : "Jours suivants"}
          className={cn(
            "absolute top-1/2 z-50 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-rule bg-snow/95 shadow-lg transition hover:border-earth disabled:pointer-events-none disabled:opacity-0",
            side === "start" ? "start-[190px]" : "end-3",
          )}
        >
          {side === "start" ? <ChevronLeft className="h-5 w-5" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
        </button>
      ))}
      </div>

      <ul className="hidden flex-wrap gap-x-4 gap-y-2 text-xs text-muted sm:flex">
        <li className="flex items-center gap-1.5">
          <PlatformIcon source="AIRBNB" /> Airbnb
        </li>
        <li className="flex items-center gap-1.5">
          <PlatformIcon source="BOOKING_COM" /> Booking.com
        </li>
        <li className="flex items-center gap-1.5">
          <PlatformIcon source="WEBSITE" /> Site
        </li>
        <li className="flex items-center gap-1.5">
          <PlatformIcon source="WHATSAPP" /> WhatsApp
        </li>
        <li className="flex items-center gap-1.5">
          <PlatformIcon source="PHONE" /> Téléphone
        </li>
        {(["PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED"] as BookingStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-5 rounded-sm", statusBar[s])} />
            {statusName[s]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-sm bg-stone-200" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,.15) 0 3px, transparent 3px 6px)" }} /> Fermée
        </li>
        <li>
          <span className="text-rose-700">×</span> fermée sur cette plateforme
        </li>
        {canEdit && <li>Cliquez sur un prix pour le changer (Entrée ou Tab pour enregistrer). Glissez sur plusieurs nuits ou chambres pour tout modifier d’un coup.</li>}
      </ul>

      {/* booking hover card */}
      {card && (
        <div
          role="tooltip"
          style={{
            left: Math.min(card.x + 16, (typeof window !== "undefined" ? window.innerWidth : 1600) - 300),
            top: Math.min(card.y + 16, (typeof window !== "undefined" ? window.innerHeight : 900) - 260),
          }}
          className="pointer-events-none fixed z-[70] grid w-[280px] gap-2 rounded-[12px] border border-rule bg-snow p-4 text-sm shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <PlatformIcon source={card.b.source} className="h-5 w-5 rounded-[4px]" />
            <span className="truncate font-semibold">{card.b.guest}</span>
          </div>
          <p className="text-xs text-muted">
            {sourceLabel[card.b.source]}
            {card.b.ota ? "" : ` · ${statusName[card.b.status] ?? card.b.status}`} · <span className="font-mono">{card.b.reference}</span>
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-muted">Séjour</dt>
            <dd>
              {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${card.b.checkIn}T00:00:00Z`))} →{" "}
              {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${card.b.checkOut}T00:00:00Z`))} · {card.b.nights} n.
            </dd>
            <dt className="text-muted">Personnes</dt>
            <dd>
              {card.b.adults} · {bedLabel[card.b.bedSetup]}
            </dd>
            {card.b.arrivalTime && (
              <>
                <dt className="text-muted">Arrivée</dt>
                <dd>vers {card.b.arrivalTime}</dd>
              </>
            )}
            <dt className="text-muted">Montant</dt>
            <dd className="font-medium">
              {nf.format(card.b.total)} {card.b.currency === "EUR" ? "€" : card.b.currency}
            </dd>
            <dt className="text-muted">Paiement</dt>
            <dd className={card.b.paymentStatus === "UNPAID" ? "text-rose-700" : "text-emerald-800"}>
              {paymentLabel[card.b.paymentStatus]}
              {card.b.paymentStatus === "DEPOSIT_PAID" ? ` (${nf.format(card.b.deposit)} ${card.b.currency === "EUR" ? "€" : card.b.currency})` : ""}
            </dd>
            {(card.b.country || card.b.phone) && (
              <>
                <dt className="text-muted">Client</dt>
                <dd className="flex items-center gap-1">
                  {card.b.phone && <Phone className="h-3 w-3" aria-hidden="true" />}
                  <span dir="ltr">{[card.b.phone, card.b.country].filter(Boolean).join(" · ")}</span>
                </dd>
              </>
            )}
          </dl>
          <p className="text-xs text-muted">Cliquez pour ouvrir la réservation.</p>
        </div>
      )}

      {drawer && canEdit && <ActionDrawer selection={drawer} rooms={data.rooms} nights={data.nights} today={today} onClose={closeDrawer} onDone={done} />}

      {blockMenu && (
        <>
          <button type="button" aria-label="Fermer" onClick={() => setBlockMenu(null)} className="fixed inset-0 z-40 bg-ink/20" />
          <div role="dialog" className="fixed inset-x-4 bottom-4 z-50 mx-auto grid max-w-sm gap-3 rounded-[14px] border border-rule bg-snow p-5 shadow-2xl sm:bottom-auto sm:top-1/3">
            <p className="font-medium">{blockMenu.kind === "maintenance" ? "Travaux" : "Chambre fermée"}</p>
            <p className="text-sm text-muted">
              {data.rooms.find((x) => x.id === blockMenu.roomId)?.name} · nuits du {blockMenu.start} au {blockMenu.end} (départ)
              {blockMenu.reason ? ` · ${blockMenu.reason}` : ""}
            </p>
            {canEdit && blockMenu.kind !== "ical" ? (
              <button
                type="button"
                disabled={reopening}
                onClick={() =>
                  startReopen(async () => {
                    const res = await reopenBlock(blockMenu.id);
                    setBlockMenu(null);
                    setToast({ ok: res.ok, text: res.ok ? res.message : res.error });
                    router.refresh();
                  })
                }
                className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-medium text-snow hover:bg-earth disabled:opacity-60"
              >
                {reopening && <Loader2 className="h-4 w-4 animate-spin" />}
                Rouvrir ces nuits partout
              </button>
            ) : (
              <p className="text-xs text-muted">{canEdit ? "Ce séjour vient d’une plateforme : modifiez-le là-bas." : "Seuls le propriétaire et les administrateurs peuvent rouvrir."}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
