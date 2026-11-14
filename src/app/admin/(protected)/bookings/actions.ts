"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingSource, BookingStatus, Locale, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/admin/guard";
import { nextStatuses } from "@/lib/admin/labels";
import { parseStayQuery } from "@/lib/booking/availability";
import { adminGuestSchema, createBooking, restoreBooking } from "@/lib/booking/create";
import { sendStatusEmail } from "@/lib/email/booking";

const back = (id: string, params: Record<string, string>): never => {
  revalidatePath("/admin", "layout");
  redirect(`/admin/bookings/${id}?${new URLSearchParams(params)}`);
};

/** Move a booking to its next status. Confirm and cancel can email the guest. */
export async function changeStatus(id: string, to: BookingStatus, form: FormData) {
  await requireUser();
  const b = await db.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (!nextStatuses[b.status].includes(to)) back(id, { error: "transition" });

  await db.booking.update({ where: { id }, data: { status: to, cancelledAt: to === "CANCELLED" ? new Date() : undefined } });

  let email = "";
  if ((to === "CONFIRMED" || to === "CANCELLED") && form.get("notify") === "on") {
    email = await sendStatusEmail(id, to === "CONFIRMED" ? "confirmed" : "cancelled");
  }
  back(id, { done: to, ...(email ? { email } : {}) });
}

/** Re-open a cancelled booking, only if the nights are still free. */
export async function restore(id: string) {
  await requireUser();
  const ok = await restoreBooking(id);
  back(id, ok ? { done: "CONFIRMED" } : { error: "restore" });
}

const paymentSchema = z.object({
  paymentStatus: z.enum(["UNPAID", "DEPOSIT_PAID", "PAID", "REFUNDED"]),
  depositAmount: z.coerce.number().min(0).max(100_000),
  paymentMethod: z.string().trim().max(40),
});

export async function savePayment(id: string, form: FormData) {
  await requireUser();
  const p = paymentSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return back(id, { error: "payment" });
  const data = p.data;
  await db.booking.update({
    where: { id },
    data: { paymentStatus: data.paymentStatus as PaymentStatus, depositAmount: data.depositAmount, paymentMethod: data.paymentMethod || null },
  });
  back(id, { done: "payment" });
}

export async function saveNotes(id: string, form: FormData) {
  await requireUser();
  const notes = String(form.get("internalNotes") ?? "").slice(0, 4000);
  const arrival = String(form.get("arrivalTime") ?? "").slice(0, 20);
  await db.booking.update({ where: { id }, data: { internalNotes: notes, arrivalTime: arrival } });
  back(id, { done: "notes" });
}

export type NewBookingState = { error?: string; values?: Record<string, string> };

const SOURCES: BookingSource[] = ["WHATSAPP", "PHONE", "EMAIL", "BOOKING_COM", "AIRBNB", "AGENCY", "WALK_IN", "WEBSITE"];
const LOCALES: Locale[] = ["en", "fr", "es", "ar"];

/** A booking taken by the riad itself (phone, WhatsApp, agencies…). */
export async function createManualBooking(_prev: NewBookingState, form: FormData): Promise<NewBookingState> {
  await requireUser();
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));

  const { query, error } = parseStayQuery({ checkIn: values.checkIn, checkOut: values.checkOut, adults: values.adults });
  if (!query) return { error: `dates_${error}`, values };

  const guest = adminGuestSchema.safeParse({ ...values, arrivalTime: values.arrivalTime || "unknown" });
  if (!guest.success) return { error: `guest_${String(guest.error.issues[0]?.path[0] ?? "")}`, values };

  const source = SOURCES.includes(values.source as BookingSource) ? (values.source as BookingSource) : "PHONE";
  const locale = LOCALES.includes(values.locale as Locale) ? (values.locale as Locale) : "fr";
  const total = values.total ? Number(values.total) : undefined;
  if (total !== undefined && (!Number.isFinite(total) || total < 0)) return { error: "total", values };

  const result = await createBooking({
    roomSlug: values.room,
    query,
    guest: guest.data,
    locale,
    admin: { source, status: values.status === "PENDING" ? "PENDING" : "CONFIRMED", total, internalNotes: values.internalNotes?.slice(0, 4000) },
  });
  if (!result.ok) return { error: result.error === "unavailable" ? `unavailable_${result.reason ?? ""}` : result.error, values };

  revalidatePath("/admin", "layout");
  redirect(`/admin/bookings/${result.id}?done=created`);
}
