"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import type { BookingSource, BookingStatus, Locale, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { canManage, requireManager, requireUser } from "@/lib/admin/guard";
import { nextStatuses } from "@/lib/admin/labels";
import { parseStayQuery } from "@/lib/booking/availability";
import { adminGuestSchema, createBooking, restoreBooking } from "@/lib/booking/create";
import { groupIds } from "@/lib/booking/group";
import { deletePrivate, proofKey } from "@/lib/storage/r2";
import { sendStatusEmail } from "@/lib/email/booking";
import { cancelInBeds24, pushBookingSafe } from "@/lib/beds24/push";
import { beds24Conflict, beds24HasRoom } from "@/lib/beds24/live";
import { pullFromBeds24 } from "@/lib/beds24/pull";
import { OTA_REF_PREFIX } from "@/lib/beds24/rooms";

/**
 * Last check before the riad accepts or confirms one of its own bookings: the nights may have been sold meanwhile on
 * another channel (or closed). Checks the site's database (other bookings, closures) and Beds24 live.
 * Returns the conflict to show, or null when the nights are still free.
 */
async function stillFree(id: string): Promise<string | null> {
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { reference: true, roomId: true, checkIn: true, checkOut: true, room: { select: { slug: true } } } });
  const overlap = { roomId: b.roomId, checkIn: { lt: b.checkOut }, checkOut: { gt: b.checkIn } };
  const clash = await db.booking.findFirst({
    where: { ...overlap, id: { not: id }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    select: { reference: true, source: true, guest: { select: { firstName: true, lastName: true } } },
  });
  if (clash) return `réservation ${clash.source === "AIRBNB" ? "Airbnb" : clash.source === "BOOKING_COM" ? "Booking.com" : clash.reference} de ${clash.guest.firstName} ${clash.guest.lastName}`.trim();
  const block = await db.roomBlock.findFirst({ where: { roomId: b.roomId, startDate: { lt: b.checkOut }, endDate: { gt: b.checkIn } }, select: { reason: true } });
  if (block) return `chambre fermée sur ces dates${block.reason ? ` (${block.reason})` : ""}`;
  const live = await beds24Conflict(b.room.slug, b.checkIn, b.checkOut, b.reference);
  if (live && live !== "unknown") {
    after(() => pullFromBeds24());
    return live;
  }
  return null;
}

/** Booking.com / Airbnb reservations mirrored from Beds24: their status changes on the platform, never here. */
async function isOta(id: string) {
  const b = await db.booking.findUnique({ where: { id }, select: { reference: true } });
  return Boolean(b?.reference.startsWith(OTA_REF_PREFIX));
}

/** A same-site admin path sent back by the panel forms (never an open redirect). */
function safeReturn(form?: FormData) {
  const r = String(form?.get("_return") ?? "");
  return /^\/admin(\/|\?|$)/.test(r) && !r.startsWith("//") && r.length < 500 ? r : null;
}

/**
 * After a booking action, show the result with its message:
 * full page → /admin/bookings/<id>?done=…; side panel → the page underneath with ?b=<id>&done=…
 */
async function back(id: string, params: Record<string, string>, form?: FormData) {
  // no revalidatePath("/admin", "layout") here: in production, revalidating the whole admin layout and
  // redirecting in the same action left the client without the new page. The redirect alone renders the
  // destination fresh (every admin page is dynamic), layout and pending counter included.
  const page = safeReturn(form);
  const qs = new URLSearchParams(params).toString();
  if (page) redirect(`${page}${page.includes("?") ? "&" : "?"}b=${encodeURIComponent(id)}&${qs}`);
  redirect(`/admin/bookings/${id}?${qs}`);
}

/** Every room of the reservation must still be free; returns the first conflict found. */
async function groupConflict(ids: string[]) {
  for (const gid of ids) {
    const c = await stillFree(gid);
    if (c) return c;
  }
  return null;
}
const pushAll = (ids: string[]) =>
  after(async () => {
    for (const gid of ids) await pushBookingSafe(gid); // Booking.com / Airbnb reopen or close the nights
  });

/**
 * Move a booking to its next status. Confirm and cancel can email the guest.
 * A reservation of several rooms moves as one: every room gets the new status (see lib/booking/group.ts).
 */
export async function changeStatus(id: string, to: BookingStatus, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (!nextStatuses[b.status].includes(to)) return back(id, { error: "transition" }, form);
  const ids = await groupIds(id);
  if (to === "CONFIRMED") {
    const conflict = await groupConflict(ids);
    if (conflict) return back(id, { error: "conflict", detail: conflict }, form);
  }

  await db.booking.updateMany({
    where: { id: { in: ids }, status: b.status },
    data: {
      status: to,
      cancelledAt: to === "CANCELLED" ? new Date() : undefined,
      // confirming straight from "awaiting payment" means the deposit was paid another way
      ...(to === "CONFIRMED" && b.status === "AWAITING_PAYMENT" ? { paymentStatus: "DEPOSIT_PAID" as PaymentStatus } : {}),
    },
  });
  pushAll(ids);

  let email = "";
  if ((to === "CONFIRMED" || to === "CANCELLED") && form.get("notify") === "on") {
    email = await sendStatusEmail(id, to === "CONFIRMED" ? "confirmed" : "cancelled");
  }
  return back(id, { done: to, ...(email ? { email } : {}) }, form);
}

/** Step 2 of the flow: the riad accepts a request. The guest gets the link to pay the deposit and upload the proof. */
export async function acceptBooking(id: string, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (b.status !== "PENDING") return back(id, { error: "transition" }, form);
  const ids = await groupIds(id);
  const conflict = await groupConflict(ids);
  if (conflict) return back(id, { error: "conflict", detail: conflict }, form);
  await toAwaitingPayment(ids, "PENDING");
  const email = form.get("notify") === "on" ? await sendStatusEmail(id, "accepted") : "";
  return back(id, { done: "accepted", ...(email ? { email } : {}) }, form);
}

/** "Awaiting payment" needs the secret link of the payment page: give one to every room that has none. */
async function toAwaitingPayment(ids: string[], from?: BookingStatus) {
  const rows = await db.booking.findMany({ where: { id: { in: ids }, ...(from ? { status: from } : {}) }, select: { id: true, payToken: true } });
  await db.$transaction(
    rows.map((r) =>
      db.booking.update({
        where: { id: r.id },
        data: { status: "AWAITING_PAYMENT", acceptedAt: new Date(), cancelledAt: null, payToken: r.payToken ?? randomBytes(24).toString("base64url") },
      }),
    ),
  );
}

/** The riad has no room for this request: cancel it and tell the guest. */
export async function declineBooking(id: string, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (b.status !== "PENDING") return back(id, { error: "transition" }, form);
  const ids = await groupIds(id);
  await db.booking.updateMany({ where: { id: { in: ids }, status: "PENDING" }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  pushAll(ids);
  const email = form.get("notify") === "on" ? await sendStatusEmail(id, "declined") : "";
  return back(id, { done: "declined", ...(email ? { email } : {}) }, form);
}

/** Last step: the proof is good. The booking is confirmed and the guest gets the confirmation with the voucher PDF. */
export async function approvePayment(id: string, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (b.status !== "PAYMENT_REVIEW") return back(id, { error: "transition" }, form);
  const ids = await groupIds(id);
  const conflict = await groupConflict(ids);
  if (conflict) return back(id, { error: "conflict", detail: conflict }, form);
  await db.booking.updateMany({ where: { id: { in: ids }, status: { in: ["PAYMENT_REVIEW", "AWAITING_PAYMENT"] } }, data: { status: "CONFIRMED", paymentStatus: "DEPOSIT_PAID" } });
  const email = form.get("notify") === "on" ? await sendStatusEmail(id, "confirmed") : "";
  return back(id, { done: "CONFIRMED", ...(email ? { email } : {}) }, form);
}

/** The proof can't be accepted (wrong amount, unreadable…): back to "awaiting payment", the guest can upload again. */
export async function rejectProof(id: string, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (b.status !== "PAYMENT_REVIEW") return back(id, { error: "transition" }, form);
  const ids = await groupIds(id);
  await db.booking.updateMany({ where: { id: { in: ids }, status: "PAYMENT_REVIEW" }, data: { status: "AWAITING_PAYMENT" } });
  const email = form.get("notify") === "on" ? await sendStatusEmail(id, "proofRejected") : "";
  return back(id, { done: "proofRejected", ...(email ? { email } : {}) }, form);
}

/** Send the payment link again (the guest lost the email). */
export async function resendPaymentLink(id: string, form?: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (b.status !== "AWAITING_PAYMENT") return back(id, { error: "transition" }, form);
  return back(id, { done: "resent", email: await sendStatusEmail(id, "accepted") }, form);
}

/** Re-open a cancelled booking (all its rooms), only if the nights are still free. */
export async function restore(id: string, form?: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const ids = await groupIds(id);
  // re-opening a cancelled stay: the nights may have been sold on another channel since
  const conflict = await groupConflict(ids);
  if (conflict) return back(id, { error: "conflict", detail: conflict }, form);
  let ok = true;
  for (const gid of ids) ok = (await restoreBooking(gid)) && ok;
  pushAll(ids);
  return back(id, ok ? { done: "CONFIRMED" } : { error: "restore" }, form);
}

const SETTABLE: BookingStatus[] = ["PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"];
const OCCUPYING: BookingStatus[] = ["PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];

/**
 * Put the reservation (all its rooms) in any status, for the cases the step-by-step buttons don't cover
 * (a phone booking that still has to pay, a mistake to undo…). Re-occupying the nights checks they are still free.
 * "Awaiting payment" creates the payment link; the guest is emailed only when "notify" is ticked.
 */
export async function setStatus(id: string, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const to = String(form.get("status") ?? "") as BookingStatus;
  if (!SETTABLE.includes(to)) return back(id, { error: "transition" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  // "seulement cette chambre": one room of a multi-room reservation (cancel one room, for example)
  const ids = form.get("only") === "on" ? [id] : await groupIds(id);
  if (b.status === to && ids.length === 1) return back(id, { done: "status" }, form);
  if (OCCUPYING.includes(to) && !OCCUPYING.includes(b.status)) {
    const conflict = await groupConflict(ids);
    if (conflict) return back(id, { error: "conflict", detail: conflict }, form);
  }
  if (to === "AWAITING_PAYMENT") await toAwaitingPayment(ids);
  else
    await db.booking.updateMany({
      where: { id: { in: ids } },
      data: { status: to, cancelledAt: to === "CANCELLED" ? new Date() : OCCUPYING.includes(to) ? null : undefined },
    });
  pushAll(ids);

  const notify = form.get("notify") === "on";
  const kind = to === "AWAITING_PAYMENT" ? "accepted" : to === "CONFIRMED" ? "confirmed" : to === "CANCELLED" ? "cancelled" : null;
  const email = notify && kind ? await sendStatusEmail(id, kind) : "";
  return back(id, { done: "status", ...(email ? { email } : {}) }, form);
}

const paymentSchema = z.object({
  paymentStatus: z.enum(["UNPAID", "DEPOSIT_PAID", "PAID", "REFUNDED"]),
  depositAmount: z.coerce.number().min(0).max(100_000),
  paymentMethod: z.string().trim().max(40),
});

export async function savePayment(id: string, form: FormData) {
  await requireUser();
  const p = paymentSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return back(id, { error: "payment" }, form);
  const data = p.data;
  // several rooms: one payment for the reservation, the deposit split between the rooms in proportion to their price
  const rows = await db.booking.findMany({ where: { id: { in: await groupIds(id) } }, select: { id: true, total: true }, orderBy: { createdAt: "asc" } });
  const sum = rows.reduce((t, r) => t + Number(r.total), 0);
  let left = data.depositAmount;
  await db.$transaction(
    rows.map((r, i) => {
      const share = i === rows.length - 1 ? left : Math.round((sum > 0 ? (data.depositAmount * Number(r.total)) / sum : data.depositAmount / rows.length) * 100) / 100;
      left = Math.round((left - share) * 100) / 100;
      return db.booking.update({
        where: { id: r.id },
        data: { paymentStatus: data.paymentStatus as PaymentStatus, depositAmount: share, paymentMethod: data.paymentMethod || null },
      });
    }),
  );
  return back(id, { done: "payment" }, form);
}

export async function saveNotes(id: string, form: FormData) {
  await requireUser();
  const notes = String(form.get("internalNotes") ?? "").slice(0, 4000);
  const arrival = String(form.get("arrivalTime") ?? "").slice(0, 20);
  await db.booking.update({ where: { id }, data: { internalNotes: notes, arrivalTime: arrival } });
  return back(id, { done: "notes" }, form);
}

/**
 * People and bed setup of each room of the reservation (one room, or every room of a multi-room reservation).
 * The price is not recalculated: the riad adjusts it in "Modifier le paiement" if needed.
 */
export async function saveStay(id: string, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const ids = await groupIds(id);
  const updates: { id: string; adults: number; bedSetup: "DOUBLE" | "TWIN" }[] = [];
  for (const gid of ids) {
    const adults = Number(form.get(`adults_${gid}`));
    const bed = form.get(`bed_${gid}`);
    if (!Number.isInteger(adults) || adults < 1 || adults > 6) return back(id, { error: "stay" }, form);
    updates.push({ id: gid, adults, bedSetup: bed === "TWIN" ? "TWIN" : "DOUBLE" });
  }
  await db.$transaction(updates.map((u) => db.booking.update({ where: { id: u.id }, data: { adults: u.adults, bedSetup: u.bedSetup } })));
  pushAll(ids); // the guest count follows in Beds24
  return back(id, { done: "stay" }, form);
}

export type NewBookingState = { error?: string; detail?: string; values?: Record<string, string> };

const SOURCES: BookingSource[] = ["WHATSAPP", "PHONE", "EMAIL", "BOOKING_COM", "AIRBNB", "AGENCY", "WALK_IN", "WEBSITE"];
const LOCALES: Locale[] = ["en", "fr", "es", "de", "ar"];

/**
 * A booking taken by the riad itself (phone, WhatsApp, agencies…), for one room or several rooms on the same dates
 * (a family or a group). Several rooms = one booking per room, same guest, linked by a note listing the references:
 * each room keeps its own status, and each is closed on Booking.com / Airbnb on its own.
 */
export async function createManualBooking(_prev: NewBookingState, form: FormData): Promise<NewBookingState> {
  await requireUser();
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));

  const { query, error } = parseStayQuery({ checkIn: values.checkIn, checkOut: values.checkOut, adults: values.adults });
  if (!query) return { error: `dates_${error}`, values };

  const guest = adminGuestSchema.safeParse({ ...values, arrivalTime: values.arrivalTime || "unknown" });
  if (!guest.success) return { error: `guest_${String(guest.error.issues[0]?.path[0] ?? "")}`, values };

  const wanted = [...new Set((values.rooms ?? values.room ?? "").split(",").map((x) => x.trim()).filter(Boolean))].slice(0, 10);
  const rooms = await db.room.findMany({ where: { slug: { in: wanted }, active: true }, orderBy: { order: "asc" }, select: { slug: true, name: true } });
  if (!rooms.length) return { error: "rooms_missing", values };
  const multi = rooms.length > 1;

  const source = SOURCES.includes(values.source as BookingSource) ? (values.source as BookingSource) : "PHONE";
  const locale = LOCALES.includes(values.locale as Locale) ? (values.locale as Locale) : "fr";
  const totals = new Map<string, number | undefined>();
  for (const r of rooms) {
    const raw = multi ? values[`total_${r.slug}`] : values.total;
    const total = raw ? Number(raw) : undefined;
    if (total !== undefined && (!Number.isFinite(total) || total < 0)) return { error: "total", detail: r.name, values };
    totals.set(r.slug, total);
  }

  // same live check as the website: the nights may just have been sold on Booking.com or Airbnb
  const live = await Promise.all(rooms.map((r) => beds24HasRoom(r.slug, query.checkIn, query.checkOut)));
  const sold = rooms.filter((_, i) => live[i] === false);
  if (sold.length) {
    after(() => pullFromBeds24());
    return { error: "unavailable_booked", detail: sold.map((r) => r.name).join(", "), values };
  }

  const notes = values.internalNotes?.slice(0, 3500) ?? "";
  const created: { id: string; reference: string; name: string }[] = [];
  let sharedGuest: string | undefined;
  for (const r of rooms) {
    const result = await createBooking({
      roomSlug: r.slug,
      query,
      guest: guest.data,
      locale,
      guestId: sharedGuest,
      admin: { source, status: values.status === "PENDING" ? "PENDING" : "CONFIRMED", total: totals.get(r.slug), internalNotes: notes },
    });
    if (!result.ok) {
      // all or nothing: the rooms already created for this group are removed (they were not sent to Beds24 yet)
      if (created.length) await db.booking.deleteMany({ where: { id: { in: created.map((c) => c.id) } } });
      return { error: result.error === "unavailable" ? `unavailable_${result.reason ?? ""}` : result.error, detail: multi ? r.name : undefined, values };
    }
    created.push({ id: result.id, reference: result.reference, name: r.name });
    sharedGuest ??= (await db.booking.findUnique({ where: { id: result.id }, select: { guestId: true } }))?.guestId;
  }

  if (multi) {
    const group = `Groupe de ${created.length} chambres : ${created.map((c) => `${c.reference} (${c.name})`).join(" · ")}`;
    await db.$transaction(created.map((c) => db.booking.update({ where: { id: c.id }, data: { internalNotes: notes ? `${group}\n\n${notes}` : group } })));
  }

  const ids = created.map((c) => c.id);
  // a phone / WhatsApp guest who still has to pay: straight to "awaiting payment", with the payment page ready
  if (values.status === "AWAITING_PAYMENT") await toAwaitingPayment(ids);
  after(async () => {
    for (const id of ids) await pushBookingSafe(id);
  });
  revalidatePath("/admin", "layout");
  redirect(`/admin/bookings/${created[0].id}?done=created`);
}

// ───────────── Bulk actions (selection in the bookings list) ─────────────

const idsSchema = z.array(z.string().min(10).max(40)).min(1).max(500);
export type BulkResult = { ok: true; count: number } | { ok: false; error: string };

/** Cancel the selected bookings (no emails: guests are told one by one from their booking page). */
export async function bulkCancel(ids: string[]): Promise<BulkResult> {
  await requireUser();
  const p = idsSchema.safeParse(ids);
  if (!p.success) return { ok: false, error: "Sélection invalide." };
  const all = await withGroups(p.data);
  const r = await db.booking.updateMany({
    where: { id: { in: all }, status: { in: ["PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED"] }, reference: { not: { startsWith: OTA_REF_PREFIX } } },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  const cancelIds = all;
  after(async () => {
    for (const id of cancelIds) await pushBookingSafe(id);
  });
  revalidatePath("/admin", "layout");
  return { ok: true, count: r.count };
}

/**
 * Delete bookings for good (test bookings, duplicates, spam). Owner and admins only.
 * Their payment proofs and extras go with them (cascade); a guest left without any booking is deleted too.
 */
/** A row of the list can be a reservation of several rooms: the action covers all its rooms. */
async function withGroups(ids: string[]) {
  const out = new Set<string>();
  for (const id of ids) for (const gid of await groupIds(id)) out.add(gid);
  return [...out];
}

async function hardDelete(selection: string[]) {
  const ids = await withGroups(selection);
  const proofKeys: string[] = [];
  const { count, refs } = await db.$transaction(async (tx) => {
    // mirrored Booking.com / Airbnb reservations are never deleted here: they would come back at the next sync
    const rows = await tx.booking.findMany({ where: { id: { in: ids }, reference: { not: { startsWith: OTA_REF_PREFIX } } }, select: { id: true, guestId: true, reference: true, checkIn: true } });
    const guestIds = [...new Set(rows.map((r) => r.guestId))];
    // their payment proofs live in R2: remember the keys before the rows go (cascade)
    const proofIds = (await tx.paymentProof.findMany({ where: { bookingId: { in: rows.map((r) => r.id) } }, select: { id: true } })).map((p) => p.id);
    proofKeys.push(...proofIds.map(proofKey));
    const { count } = await tx.booking.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    await tx.guest.deleteMany({ where: { id: { in: guestIds }, bookings: { none: {} } } });
    return { count, refs: rows.map((r) => ({ reference: r.reference, checkIn: r.checkIn })) };
  });
  // the nights must reopen on Booking.com / Airbnb too
  after(() => cancelInBeds24(refs));
  after(() => deletePrivate(proofKeys));
  return count;
}

export async function bulkDelete(ids: string[]): Promise<BulkResult> {
  const user = await requireUser();
  if (!canManage(user.role)) return { ok: false, error: "Suppression réservée au propriétaire et aux administrateurs." };
  const p = idsSchema.safeParse(ids);
  if (!p.success) return { ok: false, error: "Sélection invalide." };
  const count = await hardDelete(p.data);
  revalidatePath("/admin", "layout");
  return { ok: true, count };
}

/** Delete one booking for good, from its page. */
export async function deleteBooking(id: string, form?: FormData) {
  await requireManager();
  await hardDelete([id]);
  revalidatePath("/admin", "layout");
  // from the panel: back to the page underneath (closed panel); from the full page: the list
  const page = safeReturn(form) ?? "/admin/bookings";
  redirect(`${page}${page.includes("?") ? "&" : "?"}deleted=1`);
}
