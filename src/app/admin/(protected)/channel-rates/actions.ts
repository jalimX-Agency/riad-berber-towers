"use server";

import { redirect } from "next/navigation";
import { requireManager, requireUser } from "@/lib/admin/guard";
import { nightsBetween, parseDay } from "@/lib/booking/dates";
import { applyBulk, type ChannelState } from "@/lib/beds24/calendar";
import { pullFromBeds24 } from "@/lib/beds24/pull";
import { reconcileToBeds24 } from "@/lib/beds24/push";
import { BEDS24_ROOMS } from "@/lib/beds24/rooms";

const go = (params: Record<string, string>, anchor = ""): never => redirect(`/admin/channel-rates?${new URLSearchParams(params)}${anchor}`);

/** "" → undefined, otherwise a finite number inside [min, max] (null = invalid) */
function optionalNumber(raw: FormDataEntryValue | null, min: number, max: number, integer = false): number | undefined | null {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) return null;
  return n;
}

const state = (raw: FormDataEntryValue | null): ChannelState => (raw === "open" || raw === "close" ? raw : "keep");

/** One change for prices / minimum stay / per-channel availability. Beds24 forwards it to Booking.com and Airbnb. */
export async function applyChannelChanges(form: FormData) {
  await requireManager();
  const room = String(form.get("room") ?? "");
  const from = parseDay(String(form.get("from") ?? ""));
  const to = parseDay(String(form.get("to") ?? ""));
  const back = { room: room && room in BEDS24_ROOMS ? room : "", month: String(form.get("month") ?? "") };
  if (!from || !to || to < from) return go({ ...back, error: "dates" });
  if (nightsBetween(from, to) > 400) return go({ ...back, error: "long" });
  if (room && !(room in BEDS24_ROOMS)) return go({ ...back, error: "room" });

  const booking = optionalNumber(form.get("priceBooking"), 20, 5000);
  const airbnb = optionalNumber(form.get("priceAirbnb"), 100, 50_000);
  const minStay = optionalNumber(form.get("minStay"), 1, 30, true);
  if (booking === null || airbnb === null || minStay === null) return go({ ...back, error: "value" });

  const weekdays = form.getAll("wd").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const channelState = { booking: state(form.get("stateBooking")), airbnb: state(form.get("stateAirbnb")) };
  const touches = booking !== undefined || airbnb !== undefined || minStay !== undefined || channelState.booking !== "keep" || channelState.airbnb !== "keep";
  if (!touches) return go({ ...back, error: "empty" });

  let result: { nights: number; rooms: number } | null = null;
  let error = "";
  try {
    result = await applyBulk({
      rooms: room ? [room] : [],
      from,
      to,
      weekdays,
      prices: { ...(booking !== undefined ? { booking } : {}), ...(airbnb !== undefined ? { airbnb } : {}) },
      minStay,
      channelState,
    });
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 200) : "Erreur inconnue";
  }
  if (!result) return go({ ...back, error: "beds24", detail: error });
  if (!result.nights) return go({ ...back, error: "none" });
  return go({ ...back, done: "applied", nights: String(result.nights), rooms: String(result.rooms) });
}

/** Re-read Beds24 now (new Booking.com / Airbnb bookings) and push anything the site still owes it. */
export async function syncBeds24Now() {
  await requireUser();
  const push = await reconcileToBeds24();
  const pull = await pullFromBeds24();
  if (!pull.ok) return go({ error: "sync", detail: pull.error });
  return go({ done: "synced", added: String(pull.added), removed: String(pull.removed), pushed: push.ok ? String(push.created + push.updated + push.closed) : "0" });
}
