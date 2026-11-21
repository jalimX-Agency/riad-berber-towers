"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { setClosureSafe } from "@/lib/beds24/push";
import { ROOMS_TAG } from "@/lib/admin/rooms";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireManager, requireUser } from "@/lib/admin/guard";
import { addDays, parseDay } from "@/lib/booking/dates";

const done = (params: Record<string, string>, hash = ""): never => {
  revalidatePath("/admin", "layout");
  redirect(`/admin/rates?${new URLSearchParams(params)}${hash}`);
};

/** Forms ask for the first and the LAST night; the database stores an exclusive end (the check-out day). */
function nights(from: unknown, to: unknown) {
  const s = parseDay(String(from ?? ""));
  const last = parseDay(String(to ?? ""));
  if (!s || !last || last < s) return null;
  return { start: s, end: addDays(last, 1) };
}

export async function saveBasePrices(form: FormData) {
  await requireManager();
  const updates: { id: string; price: number }[] = [];
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("price_")) continue;
    const price = Number(v);
    if (!Number.isFinite(price) || price < 1 || price > 10_000) return done({ error: "price" }, "#prices");
    updates.push({ id: k.slice(6), price: Math.round(price) });
  }
  await db.$transaction(updates.map((u) => db.room.update({ where: { id: u.id }, data: { basePrice: u.price } })));
  // base prices are the only rate data printed in the static public pages ("from 72 €");
  // seasonal rates and closures are read live by the availability engine, so they need no purge
  revalidatePath("/", "layout");
  revalidateTag(ROOMS_TAG);
  done({ done: "prices" }, "#prices");
}

const rateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  room: z.string(),
  mode: z.enum(["price", "percent"]),
  value: z.coerce.number(),
  minNights: z.coerce.number().int().min(1).max(30),
});

export async function createRate(form: FormData) {
  await requireManager();
  const p = rateSchema.safeParse(Object.fromEntries(form));
  const range = nights(form.get("from"), form.get("to"));
  if (!p.success || !range) return done({ error: "rate" }, "#seasons");
  const { name, room, mode, value, minNights } = p.data;
  if (mode === "price" && (value < 1 || value > 10_000)) return done({ error: "rate" }, "#seasons");
  if (mode === "percent" && (value < -90 || value > 300 || !Number.isInteger(value))) return done({ error: "rate" }, "#seasons");
  const roomId = room ? (await db.room.findUnique({ where: { slug: room }, select: { id: true } }))?.id : null;
  if (room && !roomId) return done({ error: "rate" }, "#seasons");

  await db.rateOverride.create({
    data: {
      name,
      roomId: roomId ?? null,
      startDate: range.start,
      endDate: range.end,
      price: mode === "price" ? Math.round(value) : null,
      percent: mode === "percent" ? value : null,
      minNights,
    },
  });
  done({ done: "rate" }, "#seasons");
}

export async function deleteRate(id: string) {
  await requireManager();
  await db.rateOverride.deleteMany({ where: { id } }); // deleteMany: a second click (or another tab) is a no-op, not a crash
  done({ done: "rate_deleted" }, "#seasons");
}

export async function createBlock(form: FormData) {
  await requireUser();
  const range = nights(form.get("from"), form.get("to"));
  const slug = String(form.get("room") ?? "");
  const reason = String(form.get("reason") ?? "").trim().slice(0, 120);
  const kind = form.get("kind") === "MAINTENANCE" ? "MAINTENANCE" : "MANUAL";
  const room = await db.room.findUnique({ where: { slug }, select: { id: true } });
  if (!range || !room) return done({ error: "block" }, "#closures");

  // never close a room over a stay that is already sold: cancel or move the booking first
  const result = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${room.id}))::text`;
      const clash = await tx.booking.findFirst({
        where: { roomId: room.id, status: { notIn: ["CANCELLED", "NO_SHOW"] }, checkIn: { lt: range.end }, checkOut: { gt: range.start } },
        select: { reference: true },
      });
      if (clash) return clash.reference;
      await tx.roomBlock.create({ data: { roomId: room.id, startDate: range.start, endDate: range.end, source: kind, reason } });
      return null;
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
  if (result) return done({ error: "block_booked", ref: result }, "#closures");
  // Beds24 closes the same nights on Booking.com and Airbnb
  after(() => setClosureSafe(slug, range.start, range.end, true));
  done({ done: "block" }, "#closures");
}

export async function deleteBlock(id: string) {
  await requireUser();
  const block = await db.roomBlock.findUnique({
    where: { id },
    select: { source: true, externalUid: true, startDate: true, endDate: true, room: { select: { slug: true } } },
  });
  if (block) {
    // iCal blocks belong to Booking.com/Airbnb and come back at the next sync: remove them there.
    // Nights closed in Beds24 ("b24:cl:…") are the owner's own closures: deleting one reopens them everywhere.
    const reopen = block.externalUid?.startsWith("b24:cl:") || block.source !== "ICAL";
    if (reopen) {
      await db.roomBlock.deleteMany({ where: { id } });
      after(() => setClosureSafe(block.room.slug, block.startDate, block.endDate, false));
    }
  }
  done({ done: "block_deleted" }, "#closures");
}
