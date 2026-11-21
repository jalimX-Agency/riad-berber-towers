"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BookingSource, BookingStatus } from "@prisma/client";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, RefreshCw, TriangleAlert, X } from "lucide-react";
import type { CalBlock, CalBooking, CalendarData } from "@/lib/admin/control-calendar";
import { reopenBlock, syncNow } from "@/app/admin/(protected)/calendar/actions";
import { cn } from "@/lib/utils";
import { ActionDrawer, type Selection } from "./ActionDrawer";
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
  const [drawer, setDrawer] = useState<Selection | null>(null);
  const [blockMenu, setBlockMenu] = useState<CalBlock | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncing, startSync] = useTransition();
  const [reopening, startReopen] = useTransition();

  // per-viewer conveniences
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rbt-cal-layers");
      if (saved) setLayers({ ...DEFAULT_LAYERS, ...JSON.parse(saved) });
    } catch {}
  }, []);
  const toggleLayer = (k: keyof Layers) =>
    setLayers((l) => {
      const next = { ...l, [k]: !l[k] };
      try {
        localStorage.setItem("rbt-cal-layers", JSON.stringify(next));
      } catch {}
      return next;
    });

  const rooms = onlyRoom === "all" ? data.rooms : data.rooms.filter((r) => r.id === onlyRoom);
  const priceRows = (["site", "booking", "airbnb", "min"] as const).filter((k) => layers[k]);

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

  const clashes = useMemo(() => {
    const out = new Set<string>();
    const items = [...data.bookings.map((b) => ({ id: b.id, roomId: b.roomId, s: b.checkIn, e: b.checkOut })), ...data.blocks.map((k) => ({ id: k.id, roomId: k.roomId, s: k.start, e: k.end }))];
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const x = items[i];
        const y = items[j];
        if (x.roomId === y.roomId && x.s < y.e && y.s < x.e) out.add(x.id).add(y.id);
      }
    return out;
  }, [data]);

  // ── selection (drag across nights and rooms) ──
  const finish = useCallback(() => {
    if (!dragging.current || !sel) return;
    dragging.current = false;
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
  const cellHandlers = (r: number, d: number) =>
    canEdit
      ? {
          onPointerDown: (e: React.PointerEvent) => {
            if (e.button !== 0) return;
            e.preventDefault();
            (e.target as Element).releasePointerCapture?.(e.pointerId);
            dragging.current = true;
            setSel({ a: { r, d }, b: { r, d } });
          },
          onPointerEnter: () => {
            if (dragging.current) setSel((s) => (s ? { ...s, b: { r, d } } : s));
          },
        }
      : {};

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

  const grid = { gridTemplateColumns: `minmax(132px, 170px) repeat(${n}, minmax(${view > 20 ? 54 : 74}px, 1fr))` };
  const rowsPerRoom = 1 + priceRows.length;

  const bar = (b: CalBooking) => {
    if (b.source === "AIRBNB" || b.source === "BOOKING_COM") {
      const c = PLATFORM_COLORS[b.source];
      return { className: "", style: { backgroundColor: c.bg, color: c.fg } };
    }
    return { className: statusBar[b.status] ?? "bg-stone-300", style: {} };
  };

  return (
    <div className="grid gap-4">
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
          {(
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
          <span className={cn("text-xs", data.sync && !data.sync.ok ? "text-rose-800" : "text-muted")}>Beds24 : {when(data.sync?.at)}</span>
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
      {clashes.size > 0 && (
        <p role="alert" className="flex items-center gap-2 rounded-[10px] border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          Conflit : deux séjours ou une fermeture se chevauchent (encadrés en rouge). Vérifiez avant de vendre ces nuits.
        </p>
      )}
      {toast && (
        <p role="status" className={cn("flex items-start gap-2 rounded-[10px] border p-3 text-sm", toast.ok ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-rose-300 bg-rose-50 text-rose-900")}>
          {toast.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fermer" className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </p>
      )}

      <MobileAgenda data={data} canEdit={canEdit} today={today} filter={filter} pageUrl={pageUrl} onEdit={setDrawer} onBlock={setBlockMenu} />

      {/* grid (tablet and desktop) */}
      <div className="hidden overflow-x-auto rounded-[12px] border border-rule bg-snow sm:block">
        <div className={cn("grid select-none text-xs", view > 20 ? "min-w-[1500px]" : "min-w-[900px]")} style={grid}>
          <div className="sticky start-0 z-30 border-b border-e border-rule bg-snow p-2 font-medium">Chambre</div>
          {data.days.map((iso, d) => {
            const dt = new Date(`${iso}T00:00:00Z`);
            const wd = dt.getUTCDay();
            return (
              <div key={iso} className={cn("grid place-items-center border-b border-rule py-1.5 text-center", (wd === 0 || wd === 6) && "bg-paper/70", iso === today && "bg-earth text-snow")} style={{ gridColumn: d + 2 }}>
                <span className="uppercase opacity-70">{new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(dt).replace(".", "")}</span>
                <span className="text-sm font-medium">{dt.getUTCDate()}</span>
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
                <div className={cn("sticky start-0 z-20 flex h-11 items-center border-e border-rule bg-snow px-2 text-sm font-medium", priceRows.length === 0 && "border-b")} style={{ gridRow: base, gridColumn: 1 }}>
                  {room.short}
                </div>
                {priceRows.map((k, j) => (
                  <div
                    key={`label-${k}`}
                    style={{ gridRow: base + 1 + j, gridColumn: 1 }}
                    className={cn("sticky start-0 z-20 flex h-[25px] items-center gap-1.5 border-e border-rule bg-snow px-2 text-[11px] text-muted", j === priceRows.length - 1 && "border-b")}
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
                      className={cn("h-11 border-e border-rule/50", (wd === 0 || wd === 6) && "bg-paper/40", inSel(r, d) && "bg-earth/20", canEdit && "cursor-cell")}
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
                      className={cn("z-10 my-1.5 truncate rounded-[6px] bg-stone-200 px-2 text-start text-stone-800", clashes.has(k.id) && "ring-2 ring-rose-600")}
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
                      className={cn("z-10 my-1.5 flex min-w-0 items-center gap-1.5 rounded-[6px] px-1.5 font-medium shadow-sm hover:brightness-95", look.className, clashes.has(b.id) && "ring-2 ring-rose-600")}
                      title={`${b.guest} · ${b.nights} nuit(s) · ${b.adults} pers. · ${nf.format(b.total)} ${b.currency}${b.ota ? "" : ` · ${statusName[b.status] ?? ""}`}`}
                    >
                      <PlatformIcon source={b.source} className="h-4 w-4 rounded-[3px] ring-1 ring-white/60" />
                      <span className="truncate">{b.guest}</span>
                      <span className="ms-auto shrink-0 opacity-80">{b.nights} n.</span>
                    </Link>
                  );
                })}

                {/* price rows */}
                {priceRows.map((k, j) =>
                  data.days.map((iso, d) => {
                    const night = nights[d];
                    const sold = used.has(d);
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
                    return (
                      <div
                        key={`${k}-${iso}`}
                        {...cellHandlers(r, d)}
                        style={{ gridRow: base + 1 + j, gridColumn: d + 2 }}
                        title={k === "booking" || k === "airbnb" ? (text === "×" ? "Fermée sur cette plateforme (pas de prix)" : undefined) : undefined}
                        className={cn(
                          "flex h-[25px] items-center justify-end border-e border-rule/40 px-1.5 tabular-nums",
                          j === priceRows.length - 1 && "border-b border-b-rule",
                          sold && "opacity-40",
                          inSel(r, d) && "bg-earth/20",
                          canEdit && "cursor-cell hover:bg-earth/10",
                          tone,
                        )}
                      >
                        {text}
                      </div>
                    );
                  }),
                )}
                {priceRows.length === 0 && <div style={{ gridRow: base, gridColumn: `2 / ${n + 2}` }} className="pointer-events-none border-b border-rule" />}
              </div>
            );
          })}

          {/* occupancy */}
          <div style={{ gridRow: 2 + rooms.length * rowsPerRoom, gridColumn: 1 }} className="sticky start-0 z-20 border-e border-rule bg-snow p-2 text-muted">
            Occupation
          </div>
          {data.days.map((iso, d) => {
            const count = data.rooms.filter((rm) => taken.get(rm.id)?.has(d)).length;
            return (
              <div key={`occ-${iso}`} style={{ gridRow: 2 + rooms.length * rowsPerRoom, gridColumn: d + 2 }} className={cn("py-2 text-center", count === data.rooms.length ? "font-semibold text-earth" : "text-muted")}>
                {count}/{data.rooms.length}
              </div>
            );
          })}
        </div>
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
        {canEdit && <li>Glissez sur les nuits (une ou plusieurs chambres) pour modifier prix et disponibilité.</li>}
      </ul>

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
