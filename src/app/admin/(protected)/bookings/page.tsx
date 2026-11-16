import Link from "next/link";
import type { BookingStatus, Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/admin/guard";
import { getActiveRooms } from "@/lib/admin/rooms";
import { todayInImlil } from "@/lib/booking/dates";
import { eur, frDate, sourceLabel, statusLabel, paymentLabel } from "@/lib/admin/labels";
import { BookingsList, type BookingRow } from "@/components/admin/BookingsList";
import { BookingPanelSlot } from "@/components/admin/BookingPanelSlot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réservations" };

/** Loaded at once and filtered in the browser. Upcoming stays are few; history is capped (Enter searches all of it). */
const LIMIT = { upcoming: 1000, past: 300, all: 300 } as const;
const STATUSES = Object.keys(statusLabel) as BookingStatus[];
type Props = { searchParams: Promise<Record<string, string | undefined>> };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default async function BookingsPage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "past" || sp.view === "all" ? sp.view : "upcoming";
  const status = STATUSES.includes(sp.status as BookingStatus) ? (sp.status as BookingStatus) : "";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const room = sp.room ?? "";
  const today = todayInImlil();
  const limit = LIMIT[view];

  // the server only narrows by text for the capped history views (Enter in the search box);
  // status / room / text on loaded rows are filtered in the browser
  const serverSearch = view !== "upcoming" && q;
  const where: Prisma.BookingWhereInput = {
    ...(view === "upcoming" ? { checkOut: { gte: today } } : view === "past" ? { checkOut: { lt: today } } : {}),
    ...(serverSearch
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

  const [found, rooms] = await Promise.all([
    db.booking.findMany({
      where,
      select: {
        id: true,
        reference: true,
        source: true,
        status: true,
        checkIn: true,
        checkOut: true,
        nights: true,
        adults: true,
        total: true,
        currency: true,
        paymentStatus: true,
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        room: { select: { name: true, slug: true } },
      },
      // upcoming: soonest first; history: latest first
      orderBy: view === "upcoming" ? { checkIn: "asc" } : { checkIn: "desc" },
      take: limit + 1, // one extra row tells whether the list is capped, without a count query
    }),
    getActiveRooms(),
  ]);
  const truncated = found.length > limit;

  const rows: BookingRow[] = found.slice(0, limit).map((b) => {
    const guest = `${b.guest.firstName} ${b.guest.lastName}`;
    return {
      id: b.id,
      reference: b.reference,
      source: sourceLabel[b.source],
      guest,
      email: b.guest.email,
      phone: b.guest.phone,
      room: b.room.name,
      roomSlug: b.room.slug,
      stay: `${frDate(b.checkIn, { day: "numeric", month: "short", year: "numeric" })} → ${frDate(b.checkOut, { day: "numeric", month: "short" })}`,
      details: `${b.nights} nuit${b.nights > 1 ? "s" : ""} · ${b.adults} adulte${b.adults > 1 ? "s" : ""}`,
      total: eur(Number(b.total), b.currency),
      payment: paymentLabel[b.paymentStatus],
      status: b.status,
      haystack: norm([b.reference, guest, b.guest.email, b.guest.phone].join(" ")),
    };
  });

  const tab = (v: string, label: string) => (
    <Link
      href={`/admin/bookings${v === "upcoming" ? "" : `?view=${v}`}`}
      aria-current={view === v ? "page" : undefined}
      className={`rounded-full px-4 py-1.5 text-sm ${view === v ? "bg-ink text-snow" : "text-muted hover:text-ink"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Réservations</p>
          <h1 className="text-4xl">Réservations</h1>
        </div>
        <Link href="/admin/bookings/new" className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouvelle réservation
        </Link>
      </header>

      {sp.deleted && (
        <p role="status" className="rounded-[10px] border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          Réservation supprimée définitivement.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {tab("upcoming", "À venir et en cours")}
        {tab("past", "Passées")}
        {tab("all", "Toutes")}
      </div>

      <BookingsList
        key={`${view}-${serverSearch ? q : ""}`}
        rows={rows}
        rooms={rooms.map((r) => ({ slug: r.slug, name: r.name }))}
        statuses={STATUSES.map((s) => ({ value: s, label: statusLabel[s] }))}
        initial={{ q, status, room }}
        truncated={truncated}
        view={view}
        canDelete={canManage(user.role)}
      />

      <BookingPanelSlot basePath="/admin/bookings" sp={sp} />
    </div>
  );
}
