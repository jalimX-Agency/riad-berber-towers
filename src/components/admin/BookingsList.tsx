"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { Ban, Download, Loader2, Search, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PendingPanel } from "@/components/admin/BookingPanel";
import { bulkCancel, bulkDelete, type BulkResult } from "@/app/admin/(protected)/bookings/actions";

export type BookingRow = {
  id: string;
  reference: string;
  source: string;
  guest: string;
  email: string;
  phone: string;
  room: string;
  roomSlug: string;
  stay: string;
  details: string;
  total: string;
  payment: string;
  status: BookingStatus;
  /** lower-case text searched by the box: reference, name, email, phone */
  haystack: string;
};

type Props = {
  rows: BookingRow[];
  rooms: { slug: string; name: string }[];
  statuses: { value: BookingStatus; label: string }[];
  initial: { q: string; status: string; room: string };
  /** more bookings exist than were loaded: the search can also look in the whole history */
  truncated: boolean;
  view: string;
  /** owner / admin: may delete bookings for good */
  canDelete: boolean;
};

const PAGE = 50;
const CANCELLABLE: BookingStatus[] = ["PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED"];
const field = "rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Filters the loaded bookings in the browser: no request per keystroke or select change.
 * The filters are mirrored in the URL (without navigation) so a filtered list can be shared or reloaded.
 * Rows can be selected for bulk actions: CSV export, cancel, delete for good (owner / admin).
 */
export function BookingsList({ rows, rooms, statuses, initial, truncated, view, canDelete }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState(initial.status);
  const [room, setRoom] = useState(initial.room);
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, startBusy] = useTransition();
  const query = useDeferredValue(q);
  const statusLabel = useMemo(() => Object.fromEntries(statuses.map((s) => [s.value, s.label])), [statuses]);

  const filtered = useMemo(() => {
    const needle = norm(query);
    const digits = needle.replace(/\D/g, "");
    return rows.filter(
      (r) =>
        (!status || r.status === status) &&
        (!room || r.roomSlug === room) &&
        (!needle || r.haystack.includes(needle) || (digits.length >= 4 && r.haystack.replace(/\D/g, "").includes(digits))),
    );
  }, [rows, query, status, room]);

  // keep the URL in sync without a server round trip
  useEffect(() => {
    const p = new URLSearchParams();
    if (view !== "upcoming") p.set("view", view);
    if (query.trim()) p.set("q", query.trim());
    if (status) p.set("status", status);
    if (room) p.set("room", room);
    const open = new URLSearchParams(window.location.search).get("b"); // keep an open panel
    if (open) p.set("b", open);
    const s = p.toString();
    window.history.replaceState(null, "", `/admin/bookings${s ? `?${s}` : ""}`);
    setShown(PAGE);
  }, [query, status, room, view]);

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
        if (r.ok) {
          setMessage({ ok: true, text: done(r.count) });
          setSelected(new Set());
          router.refresh();
        } else setMessage({ ok: false, text: r.error });
      } catch {
        setMessage({ ok: false, text: "L’action n’a pas pu aboutir. Réessayez." });
      }
    });

  const exportCsv = () => {
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = ["Référence", "Client", "Email", "Téléphone", "Chambre", "Séjour", "Détails", "Total", "Paiement", "Statut", "Source"];
    const lines = picked.map((r) =>
      [r.reference, r.guest, r.email, r.phone, r.room, r.stay, r.details, r.total, r.payment, statusLabel[r.status], r.source].map(cell).join(";"),
    );
    // BOM so Excel opens the accents correctly; ";" is the separator Excel expects in French locales
    const blob = new Blob([`﻿${[head.map(cell).join(";"), ...lines].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const any = q || status || room;
  // a row opens the booking in the side panel over this list, keeping the filters
  const rowHref = (id: string) => {
    const p = new URLSearchParams();
    if (view !== "upcoming") p.set("view", view);
    if (query.trim()) p.set("q", query.trim());
    if (status) p.set("status", status);
    if (room) p.set("room", room);
    p.set("b", id);
    return `/admin/bookings?${p}`;
  };

  return (
    <div className="grid gap-4">
      {/* Enter in the box searches the whole history on the server when not everything is loaded */}
      <form className="flex flex-wrap items-center gap-2" role="search" action="/admin/bookings" onSubmit={(e) => !truncated && e.preventDefault()}>
        {view !== "upcoming" && <input type="hidden" name="view" value={view} />}
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Référence, nom, email, téléphone" className={`${field} w-full ps-9`} />
        </label>
        <select name="status" value={status} onChange={(e) => setStatus(e.target.value)} className={field} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="room" value={room} onChange={(e) => setRoom(e.target.value)} className={field} aria-label="Chambre">
          <option value="">Toutes les chambres</option>
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
        {any && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setStatus("");
              setRoom("");
            }}
            className="text-sm text-earth underline underline-offset-4"
          >
            Effacer
          </button>
        )}
      </form>

      {message && (
        <p role="status" className={`rounded-[10px] border p-3 text-sm ${message.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-rose-300 bg-rose-50 text-rose-900"}`}>
          {message.text}
        </p>
      )}

      <p className="text-sm text-muted" aria-live="polite">
        {filtered.length} réservation{filtered.length > 1 ? "s" : ""}
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
              <span>Client</span>
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
                  <span className="block truncate font-medium">{b.guest}</span>
                  <span className="block font-mono text-xs text-muted">
                    {b.reference} · {b.source}
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
            onClick={() => {
              if (window.confirm(`Annuler ${cancellable.length} réservation(s) ? Les nuits redeviendront disponibles. Aucun email ne sera envoyé.`))
                run(bulkCancel, cancellable.map((r) => r.id), (n) => `${n} réservation(s) annulée(s).`);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-snow/30 px-3 py-1.5 hover:bg-snow/10 disabled:opacity-50"
            title={cancellable.length === 0 ? "Aucune réservation annulable dans la sélection" : undefined}
          >
            <Ban className="h-4 w-4" aria-hidden="true" /> Annuler{cancellable.length !== selected.size && cancellable.length > 0 ? ` (${cancellable.length})` : ""}
          </button>
          {canDelete && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const n = selected.size;
                const typed = window.prompt(
                  `Supprimer définitivement ${n} réservation(s) ?\n\nLes réservations, leurs preuves de paiement et les clients sans autre réservation seront effacés. C’est irréversible.\n\nTapez SUPPRIMER pour confirmer.`,
                );
                if (typed?.trim().toUpperCase() === "SUPPRIMER") run(bulkDelete, [...selected], (c) => `${c} réservation(s) supprimée(s) définitivement.`);
              }}
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
    </div>
  );
}
