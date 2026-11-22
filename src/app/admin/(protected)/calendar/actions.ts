"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/admin/guard";
import { addDays, eachNight, nightsBetween, parseDay, toISO } from "@/lib/booking/dates";
import { setSiteNights } from "@/lib/admin/site-rates";
import { applyBulk } from "@/lib/beds24/calendar";
import { beds24Configured } from "@/lib/beds24/client";
import { pullFromBeds24 } from "@/lib/beds24/pull";
import { reconcileToBeds24, setClosureSafe } from "@/lib/beds24/push";
import { BEDS24_ROOMS } from "@/lib/beds24/rooms";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const state = z.enum(["keep", "open", "close"]).default("keep");
const money = (min: number, max: number) => z.number().min(min).max(max).optional();

const inputSchema = z.object({
  rooms: z.array(z.string().min(5).max(40)).min(1).max(20),
  from: z.string(),
  /** last night, inclusive */
  to: z.string(),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  site: money(10, 10_000),
  booking: money(20, 5000),
  airbnb: money(20, 5000),
  minStay: z.number().int().min(1).max(30).optional(),
  all: state,
  bookingState: state,
  airbnbState: state,
  note: z.string().trim().max(120).default(""),
});
export type ApplyInput = z.input<typeof inputSchema>;

/** consecutive ISO nights → [start, endExclusive] */
function runs(isos: string[]) {
  const out: { start: Date; end: Date }[] = [];
  for (const iso of [...isos].sort()) {
    const d = parseDay(iso)!;
    const last = out[out.length - 1];
    if (last && last.end.getTime() === d.getTime()) last.end = addDays(d, 1);
    else out.push({ start: d, end: addDays(d, 1) });
  }
  return out;
}

const frRange = (s: Date, e: Date) => {
  const f = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  const last = addDays(e, -1);
  return s.getTime() === last.getTime() ? f(s) : `${f(s)} → ${f(last)}`;
};

/**
 * The calendar's single "apply" action: site price, Booking.com price, Airbnb price, minimum stay,
 * close/reopen everywhere, close/reopen one platform — for one or several rooms and a range of nights.
 * Owner and admins only. Beds24 forwards channel changes to Booking.com and Airbnb within seconds.
 */
export async function applyChanges(raw: ApplyInput): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManage(user.role)) return { ok: false, error: "Modification réservée au propriétaire et aux administrateurs." };
  const p = inputSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Valeurs refusées : vérifiez les prix (site 10–10 000 €, Booking 20–5 000 €, Airbnb 20–5 000 €) et le séjour minimum (1–30)." };
  const input = p.data;

  const from = parseDay(input.from);
  const to = parseDay(input.to);
  if (!from || !to || to < from) return { ok: false, error: "Dates invalides." };
  if (nightsBetween(from, to) > 400) return { ok: false, error: "400 nuits au maximum à la fois." };

  const isos = eachNight(from, addDays(to, 1))
    .filter((d) => !input.weekdays.length || input.weekdays.includes(d.getUTCDay()))
    .map(toISO);
  if (!isos.length) return { ok: false, error: "Aucune nuit ne correspond aux jours choisis." };
  const daySet = new Set(isos);
  const ranges = runs(isos);

  const rooms = await db.room.findMany({ where: { id: { in: input.rooms }, active: true }, select: { id: true, slug: true, name: true } });
  if (!rooms.length) return { ok: false, error: "Chambre inconnue." };

  const touchesChannels = input.booking !== undefined || input.airbnb !== undefined || input.minStay !== undefined || input.bookingState !== "keep" || input.airbnbState !== "keep";
  const touchesSite = input.site !== undefined || input.minStay !== undefined;
  if (!touchesChannels && !touchesSite && input.all === "keep") return { ok: false, error: "Rien à modifier : indiquez un prix, un séjour minimum ou une ouverture/fermeture." };
  if ((input.bookingState === "open" && input.booking === undefined) || (input.airbnbState === "open" && input.airbnb === undefined)) {
    return { ok: false, error: "Pour rouvrir une plateforme, indiquez aussi son prix par nuit." };
  }

  const done: string[] = [];

  // 1) close everywhere: never over a sold night
  if (input.all === "close") {
    for (const room of rooms) {
      for (const r of ranges) {
        const clash = await db.booking.findFirst({
          where: { roomId: room.id, status: { notIn: ["CANCELLED", "NO_SHOW"] }, checkIn: { lt: r.end }, checkOut: { gt: r.start } },
          select: { reference: true, guest: { select: { lastName: true } } },
        });
        if (clash) return { ok: false, error: `${room.name} est déjà réservée (${clash.guest.lastName}, ${clash.reference}) sur ${frRange(r.start, r.end)}. Rien n’a été fermé.` };
      }
    }
    // only the nights not already closed get a new closure (closing twice used to stack two closures on the same nights)
    const creates = [];
    for (const room of rooms) {
      const existing = await db.roomBlock.findMany({
        where: { roomId: room.id, startDate: { lt: addDays(to, 1) }, endDate: { gt: from }, OR: [{ source: { in: ["MANUAL", "MAINTENANCE"] } }, { externalUid: { startsWith: "b24:cl:" } }] },
        select: { startDate: true, endDate: true },
      });
      const closed = new Set(existing.flatMap((k) => eachNight(k.startDate, k.endDate).map(toISO)));
      for (const r of runs(isos.filter((d) => !closed.has(d)))) creates.push(db.roomBlock.create({ data: { roomId: room.id, startDate: r.start, endDate: r.end, source: "MANUAL", reason: input.note } }));
    }
    if (creates.length) await db.$transaction(creates);
    await Promise.all(rooms.flatMap((room) => ranges.map((r) => setClosureSafe(room.slug, r.start, r.end, true))));
    done.push("chambre fermée partout");
  }

  // 2) reopen everywhere: cut the chosen nights out of manual and Beds24 closures
  if (input.all === "open") {
    for (const room of rooms) {
      const blocks = await db.roomBlock.findMany({
        where: { roomId: room.id, startDate: { lt: addDays(to, 1) }, endDate: { gt: from }, OR: [{ source: { in: ["MANUAL", "MAINTENANCE"] } }, { externalUid: { startsWith: "b24:cl:" } }] },
      });
      for (const b of blocks) {
        const keep = eachNight(b.startDate, b.endDate).map(toISO).filter((d) => !daySet.has(d));
        await db.$transaction([
          db.roomBlock.delete({ where: { id: b.id } }),
          // a Beds24 closure's remaining nights come back with the pull below; a manual one is rewritten now
          ...(b.externalUid ? [] : runs(keep).map((r) => db.roomBlock.create({ data: { roomId: b.roomId, startDate: r.start, endDate: r.end, source: b.source, reason: b.reason } }))),
        ]);
      }
    }
    await Promise.all(rooms.flatMap((room) => ranges.map((r) => setClosureSafe(room.slug, r.start, r.end, false))));
    done.push("chambre rouverte partout");
  }

  // 3) the site's own price / minimum stay
  if (touchesSite) {
    await db.$transaction(
      async (tx) => {
        for (const room of rooms) await setSiteNights(tx, room.id, isos, { price: input.site, minNights: input.minStay });
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
    if (input.site !== undefined) done.push(`prix site ${input.site} €`);
  }

  // 4) Booking.com / Airbnb through Beds24
  let channelError = "";
  if (touchesChannels) {
    const slugs = rooms.map((r) => r.slug).filter((s) => s in BEDS24_ROOMS);
    if (!beds24Configured()) channelError = "Beds24 n’est pas relié : prix et disponibilité des plateformes non envoyés.";
    else if (slugs.length) {
      try {
        // consecutive runs of the chosen weekdays, sent one range at a time (applyBulk filters weekdays itself)
        await applyBulk({
          rooms: slugs,
          from,
          to,
          weekdays: input.weekdays,
          prices: { ...(input.booking !== undefined ? { booking: input.booking } : {}), ...(input.airbnb !== undefined ? { airbnb: input.airbnb } : {}) },
          minStay: input.minStay,
          channelState: { booking: input.bookingState, airbnb: input.airbnbState },
        });
        if (input.booking !== undefined) done.push(`Booking ${input.booking} €`);
        if (input.airbnb !== undefined) done.push(`Airbnb ${input.airbnb} €`);
        if (input.bookingState === "close") done.push("fermée sur Booking.com");
        if (input.airbnbState === "close") done.push("fermée sur Airbnb");
        if (input.bookingState === "open") done.push("rouverte sur Booking.com");
        if (input.airbnbState === "open") done.push("rouverte sur Airbnb");
      } catch (e) {
        channelError = `Beds24 a refusé le changement : ${e instanceof Error ? e.message.slice(0, 160) : "erreur"}`;
      }
    }
  }
  if (input.minStay !== undefined) done.push(`séjour minimum ${input.minStay} nuit(s)`);

  // closures changed in Beds24: re-read so the calendar shows the truth at once
  if (input.all !== "keep" && beds24Configured()) await pullFromBeds24();
  revalidatePath("/admin/calendar");

  const scope = `${rooms.length > 1 ? `${rooms.length} chambres` : rooms[0].name} · ${isos.length} nuit(s)`;
  if (channelError) return done.length ? { ok: false, error: `${scope} : ${done.join(", ")} enregistré. ${channelError}` } : { ok: false, error: channelError };
  return { ok: true, message: `${scope} : ${done.join(", ")}.` };
}

/** Reopen the nights of one closure (click on a closure bar). Booking.com / Airbnb stays come from the platforms. */
export async function reopenBlock(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManage(user.role)) return { ok: false, error: "Modification réservée au propriétaire et aux administrateurs." };
  const block = await db.roomBlock.findUnique({ where: { id }, select: { source: true, externalUid: true, startDate: true, endDate: true, room: { select: { slug: true } } } });
  if (!block) return { ok: true, message: "Déjà rouverte." };
  const reopenable = block.source !== "ICAL" || block.externalUid?.startsWith("b24:cl:");
  if (!reopenable) return { ok: false, error: "Ce séjour vient d’une plateforme : modifiez-le sur la plateforme." };
  await db.roomBlock.deleteMany({ where: { id } });
  await setClosureSafe(block.room.slug, block.startDate, block.endDate, false);
  revalidatePath("/admin/calendar");
  return { ok: true, message: "Nuits rouvertes sur le site, Booking.com et Airbnb." };
}

/** Re-read Beds24 (new Booking.com / Airbnb bookings) and push anything the site still owes it. */
export async function syncNow(): Promise<ActionResult> {
  await requireUser();
  if (!beds24Configured()) return { ok: false, error: "Beds24 n’est pas relié sur ce serveur." };
  const push = await reconcileToBeds24();
  const pull = await pullFromBeds24();
  revalidatePath("/admin", "layout");
  if (!pull.ok) return { ok: false, error: `Synchronisation impossible : ${pull.error}` };
  const pushed = push.ok ? push.created + push.updated + push.closed : 0;
  return {
    ok: true,
    message: `Synchronisé : ${pull.created} nouvelle(s) réservation(s), ${pull.updated} modifiée(s), ${pull.cancelled} annulée(s)${pushed ? `, ${pushed} élément(s) envoyé(s) à Beds24` : ""}.`,
  };
}
