"use client";

import { toast } from "@/components/admin/Toaster";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BookingSource, BookingStatus } from "@prisma/client";
import { ArrowDownUp, Ban, Download, Loader2, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PendingPanel } from "@/components/admin/BookingPanel";
import { bulkCancel, bulkDelete, type BulkResult } from "@/app/admin/(protected)/bookings/actions";
import { DEFAULT_SORT, SORTS, filterParams, type Filters, type SortKey } from "@/lib/admin/booking-filters";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PlatformIcon } from "@/components/admin/calendar/PlatformIcon";

export type BookingRow = {
  id: string;
  reference: string;
  source: string;
  sourceKey: string;
  guest: string;
  email: string;
  phone: string;
  room: string;
  /** slugs of the rooms, space-separated (several for a multi-room reservation) */
  roomSlug: string;
  stay: string;
  details: string;
  total: string;
  totalValue: number;
  payment: string;
  paymentKey: string;
  bed: "DOUBLE" | "TWIN";
  status: BookingStatus;
  /** check-in, YYYY-MM-DD */
  checkIn: string;
  /** reservation date (Imlil time), YYYY-MM-DD, plus its timestamp for sorting and its label */
  booked: string;
  bookedTs: number;
  bookedLabel: string;
  /** lower-case text searched by the box: reference, name, email, phone */
  haystack: string;
};

type Option = { value: string; label: string };
type Props = {
  rows: BookingRow[];
  rooms: { slug: string; name: string }[];
  statuses: { value: BookingStatus; label: string }[];
  sources: Option[];
  payments: Option[];
  initial: Filters;
  /** more bookings exist than were loaded: the search can also look in the whole history */
  truncated: boolean;
  view: string;
  /** owner / admin: may delete bookings for good */
  canDelete: boolean;
};

const PAGE = 50;
const CANCELLABLE: BookingStatus[] = ["PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED"];
const BEDS: Option[] = [
  { value: "DOUBLE", label: "Grand lit" },
  { value: "TWIN", label: "Lits séparés" },
];
const field = "rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const EMPTY: Omit<Filters, "q" | "sort"> = { statuses: [], room: "", source: "", payment: "", bed: "", arrFrom: "", arrTo: "", bookFrom: "", bookTo: "" };
const shortDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

const sorters: Record<SortKey, (a: BookingRow, b: BookingRow) => number> = {
  "booked-desc": (a, b) => b.bookedTs - a.bookedTs,
  "booked-asc": (a, b) => a.bookedTs - b.bookedTs,
  "arrival-asc": (a, b) => (a.checkIn < b.checkIn ? -1 : a.checkIn > b.checkIn ? 1 : b.bookedTs - a.bookedTs),
  "arrival-desc": (a, b) => (a.checkIn > b.checkIn ? -1 : a.checkIn < b.checkIn ? 1 : b.bookedTs - a.bookedTs),
  "total-desc": (a, b) => b.totalValue - a.totalValue,
};

/**
 * The bookings list, filtered and sorted in the browser: no server request per keystroke, filter or sort.
 * Filters are mirrored in the URL (without navigation) so a filtered list can be shared or reloaded.
 * Rows can be selected for bulk actions: CSV export, cancel, delete for good (owner / admin).
 */
export function BookingsList({ rows, rooms, statuses, sources, payments, initial, truncated, view, canDelete }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(initial);
  const [panel, setPanel] = useState(() => Object.keys(EMPTY).some((k) => {
    const v = initial[k as keyof typeof EMPTY];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }));
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // results of bulk actions show as toasts
  const setMessage = (m: { ok: boolean; text: string } | null) => {
    if (m) toast(m.ok ? "success" : "error", m.text);
  };
  const [busy, startBusy] = useTransition();
  const [ask, setAsk] = useState<"cancel" | "delete" | null>(null);
  // rows deleted here disappear at once, before the refreshed list arrives
  const [gone, setGone] = useState<Set<string>>(new Set());
  // typing and clicking stay responsive even on a long list: the list catches up just after
  const f = useDeferredValue(filters);
  const statusLabel = useMemo(() => Object.fromEntries(statuses.map((s) => [s.value, s.label])), [statuses]);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((prev) => ({ ...prev, [k]: v }));

  const filtered = useMemo(() => {
    const needle = norm(f.q);
    const digits = needle.replace(/\D/g, "");
    const st = f.statuses.length ? new Set(f.statuses) : null;
    const out = rows.filter(
      (r) =>
        !gone.has(r.id) &&
        (!st || st.has(r.status)) &&
        (!f.room || r.roomSlug.split(" ").includes(f.room)) &&
        (!f.source || r.sourceKey === f.source) &&
        (!f.payment || r.paymentKey === f.payment) &&
        (!f.bed || r.bed === f.bed) &&
        (!f.arrFrom || r.checkIn >= f.arrFrom) &&
        (!f.arrTo || r.checkIn <= f.arrTo) &&
        (!f.bookFrom || r.booked >= f.bookFrom) &&
        (!f.bookTo || r.booked <= f.bookTo) &&
        (!needle || r.haystack.includes(needle) || (digits.length >= 4 && r.haystack.replace(/\D/g, "").includes(digits))),
    );
    return out.sort(sorters[f.sort]);
  }, [rows, f, gone]);

  // keep the URL in sync without a server round trip (only when it really changes)
  useEffect(() => {
    const p = filterParams(f, view);
    const open = new URLSearchParams(window.location.search).get("b"); // keep an open panel
    if (open) p.set("b", open);
    const s = p.toString();
    const next = `/admin/bookings${s ? `?${s}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
    setShown(PAGE);
  }, [f, view]);

  // a selection only ever contains rows that still exist (after a delete or a refresh)
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(rows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const visibleIds = filtered.map((r) => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));
  const picked = rows.filter((r) => selected.has(r.id));
  const cancellable = picked.filter((r) => CANCELLABLE.includes(r.status));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });

  const run = (action: (ids: string[]) => Promise<BulkResult>, ids: string[], done: (n: number) => string) =>
    startBusy(async () => {
      setMessage(null);
      try {
        const r = await action(ids);
        setAsk(null);
        if (r.ok) {
          setMessage({ ok: true, text: done(r.count) });
          setSelected(new Set());
          router.refresh();
        } else setMessage({ ok: false, text: r.error });
      } catch {
        setAsk(null);
        setMessage({ ok: false, text: "L’action n’a pas pu aboutir. Réessayez." });
      }
    });

  const exportCsv = () => {
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = ["Référence", "Réservée le", "Client", "Email", "Téléphone", "Chambre", "Séjour", "Détails", "Total", "Paiement", "Statut", "Source"];
    const lines = picked.map((r) =>
      [r.reference, r.bookedLabel, r.guest, r.email, r.phone, r.room, r.stay, r.details, r.total, r.payment, statusLabel[r.status], r.source].map(cell).join(";"),
    );
    // BOM so Excel opens the accents correctly; ";" is the separator Excel expects in French locales
    const blob = new Blob([`﻿${[head.map(cell).join(";"), ...lines].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // active advanced filters, as removable chips
  const label = (opts: Option[], v: string) => opts.find((o) => o.value === v)?.label ?? v;
  const chips: { key: string; text: string; clear: () => void }[] = [
    ...filters.statuses.map((s) => ({ key: `st-${s}`, text: statusLabel[s] ?? s, clear: () => set("statuses", filters.statuses.filter((x) => x !== s)) })),
    ...(filters.room ? [{ key: "room", text: rooms.find((r) => r.slug === filters.room)?.name ?? filters.room, clear: () => set("room", "") }] : []),
    ...(filters.source ? [{ key: "src", text: label(sources, filters.source), clear: () => set("source", "") }] : []),
    ...(filters.payment ? [{ key: "pay", text: label(payments, filters.payment), clear: () => set("payment", "") }] : []),
    ...(filters.bed ? [{ key: "bed", text: label(BEDS, filters.bed), clear: () => set("bed", "") }] : []),
    ...(filters.arrFrom || filters.arrTo
      ? [{ key: "arr", text: `Arrivée ${filters.arrFrom ? `du ${shortDate(filters.arrFrom)}` : ""} ${filters.arrTo ? `au ${shortDate(filters.arrTo)}` : ""}`.trim(), clear: () => setFilters((p) => ({ ...p, arrFrom: "", arrTo: "" })) }]
      : []),
    ...(filters.bookFrom || filters.bookTo
      ? [{ key: "book", text: `Réservée ${filters.bookFrom ? `du ${shortDate(filters.bookFrom)}` : ""} ${filters.bookTo ? `au ${shortDate(filters.bookTo)}` : ""}`.trim(), clear: () => setFilters((p) => ({ ...p, bookFrom: "", bookTo: "" })) }]
      : []),
  ];
  const clearAll = () => setFilters((p) => ({ ...p, ...EMPTY, q: "" }));

  // a row opens the booking in the side panel over this list, keeping the filters
  const rowHref = (id: string) => {
    const p = filterParams(f, view);
    p.set("b", id);
    return `/admin/bookings?${p}`;
  };

  const sel = (k: "room" | "source" | "payment" | "bed", text: string, opts: Option[]) => (
    <label className="grid gap-1 text-xs text-muted">
      {text}
      <select value={filters[k]} onChange={(e) => set(k, e.target.value)} className={field}>
        <option value="">Tous</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  const range = (from: "arrFrom" | "bookFrom", to: "arrTo" | "bookTo", text: string) => (
    <fieldset className="grid gap-1 text-xs text-muted">
      <legend className="mb-1">{text}</legend>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={filters[from]} max={filters[to] || undefined} onChange={(e) => set(from, e.target.value)} className={field} aria-label={`${text} : du`} />
        <input type="date" value={filters[to]} min={filters[from] || undefined} onChange={(e) => set(to, e.target.value)} className={field} aria-label={`${text} : au`} />
      </div>
    </fieldset>
  );

  return (
    <div className="grid gap-4">
      {/* search, sort, advanced filters */}
      <form className="flex flex-wrap items-center gap-2" role="search" action="/admin/bookings" onSubmit={(e) => !truncated && e.preventDefault()}>
        {view !== "upcoming" && <input type="hidden" name="view" value={view} />}
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Référence, nom, email, téléphone" className={`${field} w-full ps-9`} />
        </label>
        <label className="relative">
          <span className="sr-only">Trier par</span>
          <ArrowDownUp className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <select value={filters.sort} onChange={(e) => set("sort", e.target.value as SortKey)} className={`${field} ps-9`}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setPanel((v) => !v)}
          aria-expanded={panel}
          aria-controls="advanced-filters"
          className={cn("inline-flex items-center gap-2 rounded-[8px] border px-3 py-2 text-sm", panel || chips.length ? "border-earth text-earth" : "border-rule bg-snow hover:border-earth")}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filtres
          {chips.length > 0 && <span className="rounded-full bg-earth px-1.5 text-xs text-snow">{chips.length}</span>}
        </button>
      </form>

      {panel && (
        <section id="advanced-filters" aria-label="Filtres avancés" className="grid gap-4 rounded-[10px] border border-rule bg-snow p-4">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-xs text-muted">Statut (plusieurs possibles)</legend>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => {
                const on = filters.statuses.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("statuses", on ? filters.statuses.filter((x) => x !== s.value) : [...filters.statuses, s.value])}
                    className={cn("rounded-full border px-3 py-1 text-xs transition-colors", on ? "border-earth bg-earth text-snow" : "border-rule hover:border-earth")}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sel("room", "Chambre", rooms.map((r) => ({ value: r.slug, label: r.name })))}
            {sel("source", "Source", sources)}
            {sel("payment", "Paiement", payments)}
            {sel("bed", "Lits", BEDS)}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {range("arrFrom", "arrTo", "Arrivée")}
            {range("bookFrom", "bookTo", "Date de réservation")}
          </div>
        </section>
      )}

      {(chips.length > 0 || filters.q) && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={c.clear} className="inline-flex items-center gap-1.5 rounded-full border border-earth/40 bg-earth/5 px-3 py-1 text-xs text-ink hover:border-earth" aria-label={`Retirer le filtre ${c.text}`}>
              {c.text}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-xs text-earth underline underline-offset-4">
            Tout effacer
          </button>
        </div>
      )}

      <p className="text-sm text-muted" aria-live="polite">
        {filtered.length} réservation{filtered.length > 1 ? "s" : ""}
        {filters.sort === DEFAULT_SORT && " · les plus récentes d’abord"}
        {truncated && " · seules les plus récentes sont chargées : appuyez sur Entrée dans la recherche pour chercher dans tout l’historique"}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-[10px] border border-rule bg-snow p-8 text-center text-muted">Aucune réservation.</p>
      ) : (
        <ul className="divide-y divide-rule overflow-hidden rounded-[10px] border border-rule bg-snow text-sm">
          <li className="grid grid-cols-[auto_1fr] items-center bg-paper/50">
            <label className="grid h-full place-items-center px-4 py-3">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                }}
                onChange={toggleAll}
                className="h-4 w-4 accent-[var(--earth)]"
                aria-label={allVisibleSelected ? "Tout désélectionner" : `Sélectionner les ${filtered.length} réservations affichées`}
              />
            </label>
            <span aria-hidden="true" className="hidden grid-cols-[1.5fr_1fr_1.4fr_0.8fr_auto] gap-4 py-3 pe-4 text-xs uppercase tracking-wider text-muted md:grid">
              <span>Client · réservée le</span>
              <span>Chambre</span>
              <span>Séjour</span>
              <span className="text-end">Total</span>
              <span className="w-36">Statut</span>
            </span>
            <span className="py-3 pe-4 text-xs uppercase tracking-wider text-muted md:hidden">Tout sélectionner</span>
          </li>
          {filtered.slice(0, shown).map((b) => (
            <li key={b.id} className={`grid grid-cols-[auto_1fr] ${selected.has(b.id) ? "bg-earth/5" : ""}`}>
              <label className="grid place-items-center px-4">
                <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} className="h-4 w-4 accent-[var(--earth)]" aria-label={`Sélectionner ${b.reference} · ${b.guest}`} />
              </label>
              {/* one markup for every screen; no prefetch: a long list must not fire a request per row */}
              <Link
                href={rowHref(b.id)}
                prefetch={false}
                scroll={false}
                className="grid min-w-0 grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3 pe-4 hover:bg-paper/60 md:grid-cols-[1.5fr_1fr_1.4fr_0.8fr_auto] md:items-center"
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium">
                    <PlatformIcon source={b.sourceKey as BookingSource} className="h-4 w-4 rounded-[3px]" />
                    <span className="truncate">{b.guest}</span>
                  </span>
                  <span className="block truncate font-mono text-xs text-muted">
                    {b.reference} · {b.source} · {b.bookedLabel}
                  </span>
                </span>
                <span className="justify-self-end md:order-last md:w-36 md:justify-self-start">
                  <StatusBadge status={b.status} />
                </span>
                <span className="text-muted md:text-ink">{b.room}</span>
                <span className="text-end text-muted md:hidden">{b.total}</span>
                <span className="col-span-2 md:col-span-1">
                  {b.stay}
                  <span className="block text-xs text-muted">{b.details}</span>
                </span>
                <span className="hidden text-end md:block">
                  {b.total}
                  <span className="block text-xs text-muted">{b.payment}</span>
                </span>
                <PendingPanel />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="btn-outline justify-self-center">
          Afficher plus ({filtered.length - shown})
        </button>
      )}

      {/* bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-[12px] border border-rule bg-ink p-3 text-sm text-snow shadow-[0_18px_40px_-18px_rgba(47,32,22,0.6)]">
          <span className="px-2 font-medium">
            {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          <button type="button" onClick={exportCsv} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-snow/30 px-3 py-1.5 hover:bg-snow/10 disabled:opacity-50">
            <Download className="h-4 w-4" aria-hidden="true" /> Exporter (CSV)
          </button>
          <button
            type="button"
            disabled={busy || cancellable.length === 0}
            onClick={() => setAsk("cancel")}
            className="inline-flex items-center gap-1.5 rounded-full border border-snow/30 px-3 py-1.5 hover:bg-snow/10 disabled:opacity-50"
            title={cancellable.length === 0 ? "Aucune réservation annulable dans la sélection" : undefined}
          >
            <Ban className="h-4 w-4" aria-hidden="true" /> Annuler{cancellable.length !== selected.size && cancellable.length > 0 ? ` (${cancellable.length})` : ""}
          </button>
          {canDelete && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setAsk("delete")}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-3 py-1.5 hover:bg-rose-800 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Supprimer définitivement
            </button>
          )}
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-label="En cours" />}
          <button type="button" onClick={() => setSelected(new Set())} className="ms-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-snow/80 hover:bg-snow/10" aria-label="Désélectionner">
            <X className="h-4 w-4" aria-hidden="true" /> Désélectionner
          </button>
        </div>
      )}

      <ConfirmDialog
        open={ask === "cancel"}
        tone="danger"
        title={`Annuler ${cancellable.length} réservation${cancellable.length > 1 ? "s" : ""} ?`}
        body="Les nuits redeviendront disponibles. Aucun email ne sera envoyé aux clients."
        confirmLabel="Annuler les réservations"
        cancelLabel="Retour"
        busy={busy}
        onCancel={() => setAsk(null)}
        onConfirm={() => run(bulkCancel, cancellable.map((r) => r.id), (n) => `${n} réservation(s) annulée(s).`)}
      />
      <ConfirmDialog
        open={ask === "delete"}
        tone="danger"
        title={`Supprimer définitivement ${selected.size} réservation${selected.size > 1 ? "s" : ""} ?`}
        body="Les réservations, leurs preuves de paiement et les clients sans autre réservation seront effacés. C’est irréversible."
        confirmLabel="Supprimer définitivement"
        busy={busy}
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          const ids = [...selected];
          run(bulkDelete, ids, (c) => {
            setGone((prev) => new Set([...prev, ...ids]));
            return `${c} réservation(s) supprimée(s) définitivement.`;
          });
        }}
      />
    </div>
  );
}
