import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/admin/guard";
import { addDays, nightsBetween, todayInImlil, toISO } from "@/lib/booking/dates";
import { statusLabel } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendrier" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const bar: Record<BookingStatus, string> = {
  PENDING: "bg-amber-300 text-amber-950",
  CONFIRMED: "bg-emerald-600 text-white",
  CHECKED_IN: "bg-sky-600 text-white",
  CHECKED_OUT: "bg-stone-400 text-white",
  CANCELLED: "",
  NO_SHOW: "",
};

const monthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1));

export default async function CalendarPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const today = todayInImlil();
  const match = sp.month?.match(/^(\d{4})-(\d{2})$/);
  const start = match ? monthStart(Number(match[1]), Number(match[2]) - 1) : monthStart(today.getUTCFullYear(), today.getUTCMonth());
  const end = monthStart(start.getUTCFullYear(), start.getUTCMonth() + 1); // exclusive
  const days = Array.from({ length: nightsBetween(start, end) }, (_, i) => addDays(start, i));
  const prev = monthStart(start.getUTCFullYear(), start.getUTCMonth() - 1);
  const key = (d: Date) => toISO(d).slice(0, 7);

  const overlap = { checkIn: { lt: end }, checkOut: { gt: start } };
  const [rooms, bookings, blocks] = await Promise.all([
    db.room.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true, slug: true } }),
    db.booking.findMany({
      where: { ...overlap, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      select: { id: true, roomId: true, checkIn: true, checkOut: true, status: true, reference: true, guest: { select: { firstName: true, lastName: true } } },
    }),
    db.roomBlock.findMany({
      where: { startDate: { lt: end }, endDate: { gt: start } },
      select: { id: true, roomId: true, startDate: true, endDate: true, source: true, reason: true, feed: { select: { channel: true } } },
    }),
  ]);

  // a booking and a block on the same night = a double booking to fix by hand
  const clashes = new Set<string>();
  for (const b of bookings)
    for (const k of blocks) if (k.roomId === b.roomId && k.startDate < b.checkOut && k.endDate > b.checkIn) clashes.add(b.id).add(k.id);

  const col = (from: Date, to: Date) => {
    const s = Math.max(0, nightsBetween(start, from));
    const e = Math.min(days.length, nightsBetween(start, to));
    return { gridColumn: `${s + 2} / ${e + 2}` };
  };
  const occupancy = days.map((d) => bookings.filter((b) => b.checkIn <= d && b.checkOut > d).length);
  const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);
  const grid = { gridTemplateColumns: `150px repeat(${days.length}, minmax(34px, 1fr))` };

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Calendrier</p>
          <h1 className="text-4xl capitalize">{monthName}</h1>
        </div>
        <nav className="flex items-center gap-2" aria-label="Mois">
          <Link href={`/admin/calendar?month=${key(prev)}`} className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-snow hover:border-earth" aria-label="Mois précédent">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href="/admin/calendar" className="rounded-full border border-rule bg-snow px-4 py-1.5 text-sm hover:border-earth">
            Aujourd’hui
          </Link>
          <Link href={`/admin/calendar?month=${key(end)}`} className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-snow hover:border-earth" aria-label="Mois suivant">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      {clashes.size > 0 && (
        <p role="alert" className="flex items-center gap-2 rounded-[10px] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          Conflit : une réservation chevauche une fermeture ou un séjour Booking.com/Airbnb (encadré en rouge). Vérifiez et corrigez à la main.
        </p>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-rule bg-snow">
        <div className="grid min-w-[1100px] text-xs" style={grid}>
          {/* header row */}
          <div className="sticky start-0 z-20 border-b border-e border-rule bg-snow p-2 font-medium">Chambre</div>
          {days.map((d) => {
            const wd = d.getUTCDay();
            const isToday = toISO(d) === toISO(today);
            return (
              <div key={toISO(d)} className={cn("grid place-items-center border-b border-rule py-1.5 text-center", (wd === 0 || wd === 6) && "bg-paper/70", isToday && "bg-earth text-snow")}>
                <span className="uppercase opacity-70">{new Intl.DateTimeFormat("fr-FR", { weekday: "narrow", timeZone: "UTC" }).format(d)}</span>
                <span className="text-sm font-medium">{d.getUTCDate()}</span>
              </div>
            );
          })}

          {rooms.map((room, r) => {
            const row = { gridRow: r + 2 };
            return (
              <div key={room.id} className="contents">
                <div style={row} className="sticky start-0 z-20 flex items-center border-b border-e border-rule bg-snow px-2 py-3 text-sm font-medium">
                  {room.name.replace(/^Suite /, "")}
                </div>
                {/* empty day cells: click to close the room from that day */}
                {days.map((d, i) => (
                  <Link
                    key={toISO(d)}
                    href={`/admin/rates?room=${room.slug}&from=${toISO(d)}#closures`}
                    style={{ ...row, gridColumn: i + 2 }}
                    className={cn("min-h-12 border-b border-e border-rule/60 hover:bg-earth/10", (d.getUTCDay() === 0 || d.getUTCDay() === 6) && "bg-paper/40")}
                    aria-label={`Fermer ${room.name} à partir du ${toISO(d)}`}
                  />
                ))}
                {blocks
                  .filter((k) => k.roomId === room.id)
                  .map((k) => (
                    <Link
                      key={k.id}
                      href="/admin/rates#closures"
                      style={{ ...row, ...col(k.startDate, k.endDate), backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,.08) 0 6px, transparent 6px 12px)" }}
                      className={cn("z-10 my-2 truncate rounded-[6px] bg-stone-200 px-2 py-1 text-stone-800", clashes.has(k.id) && "ring-2 ring-rose-600")}
                      title={k.source === "ICAL" ? `Réservé sur ${k.feed?.channel ?? "iCal"}` : k.reason || "Fermée"}
                    >
                      {k.source === "ICAL" ? (k.feed?.channel ?? "iCal") : k.reason || "Fermée"}
                    </Link>
                  ))}
                {bookings
                  .filter((b) => b.roomId === room.id)
                  .map((b) => (
                    <Link
                      key={b.id}
                      href={`/admin/bookings/${b.id}`}
                      style={{ ...row, ...col(b.checkIn, b.checkOut) }}
                      className={cn("z-10 my-2 truncate rounded-[6px] px-2 py-1 font-medium shadow-sm hover:brightness-95", bar[b.status], clashes.has(b.id) && "ring-2 ring-rose-600")}
                      title={`${b.guest.firstName} ${b.guest.lastName} · ${b.reference} · ${statusLabel[b.status]}`}
                    >
                      {b.guest.firstName} {b.guest.lastName}
                    </Link>
                  ))}
              </div>
            );
          })}

          {/* occupancy */}
          <div style={{ gridRow: rooms.length + 2 }} className="sticky start-0 z-20 border-e border-rule bg-snow p-2 text-muted">
            Occupées
          </div>
          {occupancy.map((n, i) => (
            <div key={i} style={{ gridRow: rooms.length + 2, gridColumn: i + 2 }} className={cn("py-2 text-center", n === rooms.length ? "font-semibold text-earth" : "text-muted")}>
              {n}
            </div>
          ))}
        </div>
      </div>

      <ul className="flex flex-wrap gap-4 text-xs text-muted">
        {(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] as BookingStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-5 rounded-sm", bar[s])} />
            {statusLabel[s]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-sm bg-stone-200" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,.15) 0 3px, transparent 3px 6px)" }} />
          Fermée / Booking.com / Airbnb
        </li>
        <li>Cliquez sur un jour libre pour fermer la chambre.</li>
      </ul>
    </div>
  );
}
