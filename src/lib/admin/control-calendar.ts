import type { BedSetup, BookingSource, BookingStatus, PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, eachNight, toISO } from "@/lib/booking/dates";
import { beds24Configured } from "@/lib/beds24/client";
import { readCalendarMany, type DayCell } from "@/lib/beds24/calendar";
import { readSyncState, type SyncState } from "@/lib/beds24/pull";
import { BEDS24_ROOMS, OTA_REF_PREFIX } from "@/lib/beds24/rooms";
import { siteNight } from "./site-rates";

// Everything the control calendar shows, in one serialisable object (sent to the client grid).

export type CalRoom = { id: string; slug: string; name: string; short: string; basePrice: number; currency: string; beds24: boolean };

export type CalBooking = {
  id: string;
  reference: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: BookingStatus;
  source: BookingSource;
  /** who sold it, for icons and colours: the source, or EXPEDIA (stored as an agency booking noted "Expedia n° …") */
  platform: BookingSource | "EXPEDIA";
  guest: string;
  adults: number;
  total: number;
  currency: string;
  /** mirrored from Booking.com / Airbnb / Expedia: read-only on the site */
  ota: boolean;
  /** for the hover card */
  phone: string;
  country: string;
  paymentStatus: PaymentStatus;
  deposit: number;
  arrivalTime: string;
  bedSetup: BedSetup;
};

export type CalBlock = {
  id: string;
  roomId: string;
  start: string;
  end: string;
  kind: "manual" | "maintenance" | "beds24" | "ical";
  reason: string;
};

export type CalNight = {
  date: string;
  site: number;
  siteCustom: boolean;
  minNights: number;
  booking: number | null;
  airbnb: number | null;
  expedia: number | null;
  /** Beds24 minimum stay (applies to Booking.com and Airbnb) */
  channelMin: number | null;
};

export type CalendarData = {
  from: string;
  /** exclusive */
  to: string;
  days: string[];
  rooms: CalRoom[];
  bookings: CalBooking[];
  blocks: CalBlock[];
  nights: Record<string, CalNight[]>; // roomId → one entry per day
  beds24Error: string | null;
  sync: SyncState | null;
};

export async function loadCalendar(from: Date, to: Date): Promise<CalendarData> {
  const lastNight = addDays(to, -1);
  const overlap = { checkIn: { lt: to }, checkOut: { gt: from } };
  const [roomRows, bookingRows, blockRows, overrides, sync] = await Promise.all([
    db.room.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, slug: true, name: true, basePrice: true, currency: true } }),
    db.booking.findMany({
      where: { ...overlap, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      select: {
        id: true, reference: true, roomId: true, checkIn: true, checkOut: true, nights: true, status: true, source: true, adults: true, total: true, currency: true,
        paymentStatus: true, depositAmount: true, arrivalTime: true, bedSetup: true, internalNotes: true,
        guest: { select: { firstName: true, lastName: true, phone: true, country: true } },
      },
    }),
    db.roomBlock.findMany({
      where: { startDate: { lt: to }, endDate: { gt: from } },
      select: { id: true, roomId: true, startDate: true, endDate: true, source: true, reason: true, externalUid: true },
    }),
    db.rateOverride.findMany({ where: { startDate: { lt: to }, endDate: { gt: from } }, orderBy: { createdAt: "asc" } }),
    readSyncState().catch(() => null),
  ]);

  const rooms: CalRoom[] = roomRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    short: r.name.replace(/^Suite |^Room | Room$/g, ""),
    basePrice: Number(r.basePrice),
    currency: r.currency,
    beds24: r.slug in BEDS24_ROOMS,
  }));

  let channel = new Map<string, DayCell[]>();
  let beds24Error: string | null = null;
  if (!beds24Configured()) beds24Error = "Beds24 n’est pas relié sur ce serveur (clé BEDS24_REFRESH_TOKEN manquante) : prix Booking.com et Airbnb indisponibles.";
  else {
    try {
      channel = await readCalendarMany(rooms.filter((r) => r.beds24).map((r) => r.slug), from, lastNight);
    } catch (e) {
      beds24Error = `Beds24 ne répond pas : ${e instanceof Error ? e.message.slice(0, 160) : "erreur"}`;
    }
  }

  const dayDates = eachNight(from, to);
  const nights: Record<string, CalNight[]> = {};
  for (const room of rooms) {
    const ch = channel.get(room.slug);
    nights[room.id] = dayDates.map((d, i) => {
      const s = siteNight(room, d, overrides);
      const c = ch?.[i];
      return { date: toISO(d), site: s.price, siteCustom: s.custom, minNights: s.minNights, booking: c?.prices.booking ?? null, airbnb: c?.prices.airbnb ?? null, expedia: c?.prices.expedia ?? null, channelMin: c?.minStay ?? null };
    });
  }

  return {
    from: toISO(from),
    to: toISO(to),
    days: dayDates.map(toISO),
    rooms,
    bookings: bookingRows.map((b) => ({
      id: b.id,
      reference: b.reference,
      roomId: b.roomId,
      checkIn: toISO(b.checkIn),
      checkOut: toISO(b.checkOut),
      nights: b.nights,
      status: b.status,
      source: b.source,
      platform: b.reference.startsWith(OTA_REF_PREFIX) && b.source === "AGENCY" && b.internalNotes.startsWith("Expedia n°") ? "EXPEDIA" : b.source,
      guest: `${b.guest.firstName} ${b.guest.lastName}`.trim(),
      adults: b.adults,
      total: Number(b.total),
      currency: b.currency,
      ota: b.reference.startsWith(OTA_REF_PREFIX),
      phone: b.guest.phone,
      country: b.guest.country,
      paymentStatus: b.paymentStatus,
      deposit: Number(b.depositAmount),
      arrivalTime: b.arrivalTime,
      bedSetup: b.bedSetup,
    })),
    blocks: blockRows.map((k) => ({
      id: k.id,
      roomId: k.roomId,
      start: toISO(k.startDate),
      end: toISO(k.endDate),
      kind: k.externalUid?.startsWith("b24:") ? "beds24" : k.source === "ICAL" ? "ical" : k.source === "MAINTENANCE" ? "maintenance" : "manual",
      reason: k.reason,
    })),
    nights,
    beds24Error,
    sync,
  };
}
