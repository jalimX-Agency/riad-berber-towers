import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { ArrowRight, LogIn, LogOut, Moon, Hourglass } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/admin/guard";
import { addDays, todayInImlil } from "@/lib/booking/dates";
import { eur, frDate, sourceLabel } from "@/lib/admin/labels";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PendingPanel } from "@/components/admin/BookingPanel";
import { BookingPanelSlot } from "@/components/admin/BookingPanelSlot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableau de bord" };

const live = { status: { in: ["PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED", "CHECKED_IN"] as BookingStatus[] } };
const include = { guest: { select: { firstName: true, lastName: true, phone: true } }, room: { select: { name: true } } } as const;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminDashboard({ searchParams }: Props) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const today = todayInImlil();
  const in7 = addDays(today, 7);

  const [arrivals, departures, inHouse, pending, upcoming, roomCount] = await Promise.all([
    db.booking.findMany({ where: { ...live, checkIn: today }, include, orderBy: { room: { order: "asc" } } }),
    db.booking.findMany({ where: { status: { in: ["CONFIRMED", "CHECKED_IN"] }, checkOut: today }, include, orderBy: { room: { order: "asc" } } }),
    db.booking.count({ where: { ...live, checkIn: { lte: today }, checkOut: { gt: today } } }),
    db.booking.findMany({ where: { status: { in: ["PENDING", "PAYMENT_REVIEW"] } }, include, orderBy: { createdAt: "asc" } }),
    db.booking.findMany({ where: { ...live, checkIn: { gt: today, lte: in7 } }, include, orderBy: { checkIn: "asc" } }),
    db.room.count({ where: { active: true } }),
  ]);

  // a reservation of several rooms (same guest, same dates) is one line, with its rooms listed and amounts summed
  type Booking = (typeof arrivals)[number];
  const merge = (list: Booking[]) => {
    const groups = new Map<string, Booking[]>();
    for (const b of list) {
      const key = b.reference.startsWith("B24-") ? b.id : `${b.guestId}|${b.checkIn.toISOString()}|${b.checkOut.toISOString()}`;
      groups.set(key, [...(groups.get(key) ?? []), b]);
    }
    return [...groups.values()].map((m) => ({
      ...m[0],
      roomLabel: m.length > 1 ? `${m.length} chambres : ${m.map((x) => x.room.name.replace(/^Suite /, "")).join(", ")}` : m[0].room.name,
      sum: m.reduce((t, x) => t + Number(x.total), 0),
    }));
  };
  const lists = { arrivals: merge(arrivals), departures: merge(departures), pending: merge(pending), upcoming: merge(upcoming) };

  const tiles = [
    { label: "Arrivées aujourd’hui", value: lists.arrivals.length, icon: LogIn },
    { label: "Départs aujourd’hui", value: lists.departures.length, icon: LogOut },
    { label: "Chambres occupées ce soir", value: `${inHouse} / ${roomCount}`, icon: Moon },
    { label: "À traiter (demandes, paiements)", value: lists.pending.length, icon: Hourglass, alert: lists.pending.length > 0 },
  ];

  type Row = (typeof lists.arrivals)[number];
  const List = ({ title, rows, empty, show }: { title: string; rows: Row[]; empty: string; show: "in" | "out" | "created" }) => (
    <section className="grid content-start gap-3 rounded-[10px] border border-rule bg-snow p-5">
      <h2 className="text-xl">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-rule">
          {rows.map((b) => (
            <li key={b.id}>
              <Link href={`/admin?b=${b.id}`} prefetch={false} scroll={false} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:text-earth">
                <span className="font-medium">
                  {b.guest.firstName} {b.guest.lastName}
                </span>
                <span className="text-muted">{b.roomLabel}</span>
                <span className="text-muted">
                  {show === "created"
                    ? `${frDate(b.checkIn, { day: "numeric", month: "short" })} → ${frDate(b.checkOut, { day: "numeric", month: "short" })} · ${sourceLabel[b.source]}`
                    : show === "in"
                      ? `${b.nights} nuit${b.nights > 1 ? "s" : ""}${b.arrivalTime ? ` · arrivée ${b.arrivalTime}` : ""}`
                      : eur(b.sum, b.currency)}
                </span>
                <StatusBadge status={b.status} className="ms-auto" />
                <PendingPanel />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="grid gap-8">
      <header className="grid gap-1">
        <p className="label">{frDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <h1 className="text-4xl">Bonjour{user.name ? ` ${user.name}` : ""}</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon, alert }) => (
          <div key={label} className={`grid gap-2 rounded-[10px] border bg-snow p-5 ${alert ? "border-amber-400" : "border-rule"}`}>
            <span className="flex items-center gap-2 text-sm text-muted">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </span>
            <span className="font-display text-4xl font-semibold">{value}</span>
          </div>
        ))}
      </div>

      {lists.pending.length > 0 && <List title="Demandes à traiter" rows={lists.pending} empty="" show="created" />}

      <div className="grid gap-6 xl:grid-cols-2">
        <List title="Arrivées aujourd’hui" rows={lists.arrivals} empty="Aucune arrivée aujourd’hui." show="in" />
        <List title="Départs aujourd’hui" rows={lists.departures} empty="Aucun départ aujourd’hui." show="out" />
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Les 7 prochains jours</h2>
          <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-earth hover:underline">
            Toutes les réservations <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <List title="Prochaines arrivées" rows={lists.upcoming} empty="Aucune arrivée prévue cette semaine." show="created" />
      </section>

      <BookingPanelSlot basePath="/admin" sp={sp} />
    </div>
  );
}
