"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";

export type BookingRow = {
  id: string;
  reference: string;
  source: string;
  guest: string;
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
};

const PAGE = 50;
const field = "rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Filters the loaded bookings in the browser: no request per keystroke or select change.
 * The filters are mirrored in the URL (without navigation) so a filtered list can be shared or reloaded.
 */
export function BookingsList({ rows, rooms, statuses, initial, truncated, view }: Props) {
  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState(initial.status);
  const [room, setRoom] = useState(initial.room);
  const [shown, setShown] = useState(PAGE);
  const query = useDeferredValue(q);

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
    const s = p.toString();
    window.history.replaceState(null, "", `/admin/bookings${s ? `?${s}` : ""}`);
    setShown(PAGE);
  }, [query, status, room, view]);

  const any = q || status || room;

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

      <p className="text-sm text-muted" aria-live="polite">
        {filtered.length} réservation{filtered.length > 1 ? "s" : ""}
        {truncated && " · seules les plus récentes sont chargées : appuyez sur Entrée dans la recherche pour chercher dans tout l’historique"}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-[10px] border border-rule bg-snow p-8 text-center text-muted">Aucune réservation.</p>
      ) : (
        <ul className="divide-y divide-rule overflow-hidden rounded-[10px] border border-rule bg-snow text-sm">
          <li aria-hidden="true" className="hidden grid-cols-[1.5fr_1fr_1.4fr_0.8fr_auto] gap-4 px-4 py-3 text-xs uppercase tracking-wider text-muted md:grid">
            <span>Client</span>
            <span>Chambre</span>
            <span>Séjour</span>
            <span className="text-end">Total</span>
            <span className="w-36">Statut</span>
          </li>
          {filtered.slice(0, shown).map((b) => (
            <li key={b.id}>
              {/* one markup for every screen; no prefetch: a long list must not fire a request per row */}
              <Link
                href={`/admin/bookings/${b.id}`}
                prefetch={false}
                className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 hover:bg-paper/60 md:grid-cols-[1.5fr_1fr_1.4fr_0.8fr_auto] md:items-center"
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
    </div>
  );
}
