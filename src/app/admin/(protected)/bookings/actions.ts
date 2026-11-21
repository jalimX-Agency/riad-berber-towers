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

/** Move a booking to its next status. Confirm and cancel can email the guest. */
export async function changeStatus(id: string, to: BookingStatus, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (!nextStatuses[b.status].includes(to)) return back(id, { error: "transition" }, form);
  if (to === "CONFIRMED") {
    const conflict = await stillFree(id);
    if (conflict) return back(id, { error: "conflict", detail: conflict }, form);
  }

  await db.booking.update({
    where: { id },
    data: {
      status: to,
      cancelledAt: to === "CANCELLED" ? new Date() : undefined,
      // confirming straight from "awaiting payment" means the deposit was paid another way
      ...(to === "CONFIRMED" && b.status === "AWAITING_PAYMENT" ? { paymentStatus: "DEPOSIT_PAID" as PaymentStatus } : {}),
    },
  });
  after(() => pushBookingSafe(id)); // Booking.com / Airbnb reopen or close the nights

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
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true, payToken: true } });
  if (b.status !== "PENDING") return back(id, { error: "transition" }, form);
  const conflict = await stillFree(id);
  if (conflict) return back(id, { error: "conflict", detail: conflict }, form);
  await db.booking.update({
    where: { id },
    data: { status: "AWAITING_PAYMENT", acceptedAt: new Date(), payToken: b.payToken ?? randomBytes(24).toString("base64url") },
  });
  const email = form.get("notify") === "on" ? await sendStatusEmail(id, "accepted") : "";
  return back(id, { done: "accepted", ...(email ? { email } : {}) }, form);
}

/** The riad has no room for this request: cancel it and tell the guest. */
export async function declineBooking(id: string, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (b.status !== "PENDING") return back(id, { error: "transition" }, form);
  await db.booking.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  after(() => pushBookingSafe(id));
  const email = form.get("notify") === "on" ? await sendStatusEmail(id, "declined") : "";
  return back(id, { done: "declined", ...(email ? { email } : {}) }, form);
}

/** Last step: the proof is good. The booking is confirmed and the guest gets the confirmation with the voucher PDF. */
export async function approvePayment(id: string, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (b.status !== "PAYMENT_REVIEW") return back(id, { error: "transition" }, form);
  const conflict = await stillFree(id);
  if (conflict) return back(id, { error: "conflict", detail: conflict }, form);
  await db.booking.update({ where: { id }, data: { status: "CONFIRMED", paymentStatus: "DEPOSIT_PAID" } });
  const email = form.get("notify") === "on" ? await sendStatusEmail(id, "confirmed") : "";
  return back(id, { done: "CONFIRMED", ...(email ? { email } : {}) }, form);
}

/** The proof can't be accepted (wrong amount, unreadable…): back to "awaiting payment", the guest can upload again. */
export async function rejectProof(id: string, form: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (b.status !== "PAYMENT_REVIEW") return back(id, { error: "transition" }, form);
  await db.booking.update({ where: { id }, data: { status: "AWAITING_PAYMENT" } });
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

/** Re-open a cancelled booking, only if the nights are still free. */
export async function restore(id: string, form?: FormData) {
  await requireUser();
  if (await isOta(id)) return back(id, { error: "ota" }, form);
  // re-opening a cancelled stay: the nights may have been sold on another channel since
  const conflict = await stillFree(id);
  if (conflict) return back(id, { error: "conflict", detail: conflict }, form);
  const ok = await restoreBooking(id);
  if (ok) after(() => pushBookingSafe(id));
  return back(id, ok ? { done: "CONFIRMED" } : { error: "restore" }, form);
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
  await db.booking.update({
    where: { id },
    data: { paymentStatus: data.paymentStatus as PaymentStatus, depositAmount: data.depositAmount, paymentMethod: data.paymentMethod || null },
  });
  return back(id, { done: "payment" }, form);
}

export async function saveNotes(id: string, form: FormData) {
  await requireUser();
  const notes = String(form.get("internalNotes") ?? "").slice(0, 4000);
  const arrival = String(form.get("arrivalTime") ?? "").slice(0, 20);
  await db.booking.update({ where: { id }, data: { internalNotes: notes, arrivalTime: arrival } });
  return back(id, { done: "notes" }, form);
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
  for (const r of rooms) {
    const result = await createBooking({
      roomSlug: r.slug,
      query,
      guest: guest.data,
      locale,
      admin: { source, status: values.status === "PENDING" ? "PENDING" : "CONFIRMED", total: totals.get(r.slug), internalNotes: notes },
    });
    if (!result.ok) {
      // all or nothing: the rooms already created for this group are removed (they were not sent to Beds24 yet)
      if (created.length) await db.booking.deleteMany({ where: { id: { in: created.map((c) => c.id) } } });
      return { error: result.error === "unavailable" ? `unavailable_${result.reason ?? ""}` : result.error, detail: multi ? r.name : undefined, values };
    }
    created.push({ id: result.id, reference: result.reference, name: r.name });
  }

  if (multi) {
    const group = `Groupe de ${created.length} chambres : ${created.map((c) => `${c.reference} (${c.name})`).join(" · ")}`;
    await db.$transaction(created.map((c) => db.booking.update({ where: { id: c.id }, data: { internalNotes: notes ? `${group}\n\n${notes}` : group } })));
  }

  const ids = created.map((c) => c.id);
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
  const r = await db.booking.updateMany({
    where: { id: { in: p.data }, status: { in: ["PENDING", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED"] }, reference: { not: { startsWith: OTA_REF_PREFIX } } },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  const cancelIds = p.data;
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
async function hardDelete(ids: string[]) {
  const { count, refs } = await db.$transaction(async (tx) => {
    // mirrored Booking.com / Airbnb reservations are never deleted here: they would come back at the next sync
    const rows = await tx.booking.findMany({ where: { id: { in: ids }, reference: { not: { startsWith: OTA_REF_PREFIX } } }, select: { id: true, guestId: true, reference: true, checkIn: true } });
    const guestIds = [...new Set(rows.map((r) => r.guestId))];
    const { count } = await tx.booking.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    await tx.guest.deleteMany({ where: { id: { in: guestIds }, bookings: { none: {} } } });
    return { count, refs: rows.map((r) => ({ reference: r.reference, checkIn: r.checkIn })) };
  });
  // the nights must reopen on Booking.com / Airbnb too
  after(() => cancelInBeds24(refs));
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
