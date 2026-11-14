import Link from "next/link";
import type { BookingStatus, Prisma } from "@prisma/client";
import { Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/admin/guard";
import { todayInImlil } from "@/lib/booking/dates";
import { eur, frDate, sourceLabel, statusLabel, paymentLabel } from "@/lib/admin/labels";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réservations" };

const PAGE = 50;
const STATUSES = Object.keys(statusLabel) as BookingStatus[];
type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function BookingsPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const view = sp.view === "past" || sp.view === "all" ? sp.view : "upcoming";
  const status = STATUSES.includes(sp.status as BookingStatus) ? (sp.status as BookingStatus) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const room = sp.room ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const today = todayInImlil();

  const where: Prisma.BookingWhereInput = {
    ...(view === "upcoming" ? { checkOut: { gte: today } } : view === "past" ? { checkOut: { lt: today } } : {}),
    ...(status ? { status } : {}),
    ...(room ? { room: { slug: room } } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { guest: { firstName: { contains: q, mode: "insensitive" } } },
            { guest: { lastName: { contains: q, mode: "insensitive" } } },
            { guest: { email: { contains: q, mode: "insensitive" } } },
            { guest: { phone: { contains: q } } },
          ],
        }
      : {}),
  };

  const [rows, total, rooms] = await Promise.all([
    db.booking.findMany({
      where,
      include: { guest: { select: { firstName: true, lastName: true, email: true, phone: true } }, room: { select: { name: true } } },
      // upcoming: soonest first; history: latest first
      orderBy: view === "upcoming" ? { checkIn: "asc" } : { checkIn: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
    }),
    db.booking.count({ where }),
    db.room.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { slug: true, name: true } }),
  ]);

  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { view, status, q, room, page: undefined, ...patch } as Record<string, string | number | undefined>;
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "view" && v === "upcoming")) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  const tab = (v: string, label: string) => (
    <Link
      href={`/admin/bookings${qs({ view: v })}`}
      aria-current={view === v ? "page" : undefined}
      className={`rounded-full px-4 py-1.5 text-sm ${view === v ? "bg-ink text-snow" : "text-muted hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  const field = "rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{total} réservation{total > 1 ? "s" : ""}</p>
          <h1 className="text-4xl">Réservations</h1>
        </div>
        <Link href="/admin/bookings/new" className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouvelle réservation
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-1">
        {tab("upcoming", "À venir et en cours")}
        {tab("past", "Passées")}
        {tab("all", "Toutes")}
      </div>

      <form className="flex flex-wrap items-center gap-2" role="search">
        {view !== "upcoming" && <input type="hidden" name="view" value={view} />}
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder="Référence, nom, email, téléphone" className={`${field} w-full ps-9`} />
        </label>
        <select name="status" defaultValue={status ?? ""} className={field} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
        <select name="room" defaultValue={room} className={field} aria-label="Chambre">
          <option value="">Toutes les chambres</option>
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-outline py-2">
          Filtrer
        </button>
        {(q || status || room) && (
          <Link href={`/admin/bookings${view !== "upcoming" ? `?view=${view}` : ""}`} className="text-sm text-earth underline underline-offset-4">
            Effacer
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-rule bg-snow p-8 text-center text-muted">Aucune réservation.</p>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-rule bg-snow">
          {/* table on wide screens */}
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b border-rule text-start text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">Client</th>
                <th className="px-4 py-3 text-start font-medium">Chambre</th>
                <th className="px-4 py-3 text-start font-medium">Séjour</th>
                <th className="px-4 py-3 text-end font-medium">Total</th>
                <th className="px-4 py-3 text-start font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="font-medium hover:text-earth">
                      {b.guest.firstName} {b.guest.lastName}
                    </Link>
                    <span className="block font-mono text-xs text-muted">
                      {b.reference} · {sourceLabel[b.source]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{b.room.name}</td>
                  <td className="px-4 py-3">
                    {frDate(b.checkIn, { day: "numeric", month: "short", year: "numeric" })} → {frDate(b.checkOut, { day: "numeric", month: "short" })}
                    <span className="block text-xs text-muted">
                      {b.nights} nuit{b.nights > 1 ? "s" : ""} · {b.adults} adulte{b.adults > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    {eur(Number(b.total), b.currency)}
                    <span className="block text-xs text-muted">{paymentLabel[b.paymentStatus]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* cards on phones */}
          <ul className="divide-y divide-rule md:hidden">
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`} className="grid gap-1 p-4 text-sm">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {b.guest.firstName} {b.guest.lastName}
                    </span>
                    <StatusBadge status={b.status} />
                  </span>
                  <span className="text-muted">
                    {b.room.name} · {frDate(b.checkIn, { day: "numeric", month: "short" })} → {frDate(b.checkOut, { day: "numeric", month: "short" })}
                  </span>
                  <span className="flex justify-between text-xs text-muted">
                    <span className="font-mono">{b.reference}</span>
                    <span>{eur(Number(b.total), b.currency)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {total > PAGE && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link href={`/admin/bookings${qs({ page: page - 1 })}`} className="text-earth">← Précédentes</Link> : <span />}
          <span className="text-muted">
            Page {page} / {Math.ceil(total / PAGE)}
          </span>
          {page * PAGE < total ? <Link href={`/admin/bookings${qs({ page: page + 1 })}`} className="text-earth">Suivantes →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
