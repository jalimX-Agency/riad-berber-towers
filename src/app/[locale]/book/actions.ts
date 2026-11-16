"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import type { Locale } from "@prisma/client";
import { routing } from "@/i18n/routing";
import { parseStayQuery } from "@/lib/booking/availability";
import { createBooking, guestSchema } from "@/lib/booking/create";
import { confirmationPath, sendBookingEmails } from "@/lib/email/booking";
import { parseExtras } from "@/lib/booking/extras";

/** Pick-up place as the riad (French admin) reads it */
const PICKUP_FR = { airport: "aéroport de Marrakech", hotel: "hôtel ou riad à Marrakech", other: "autre lieu à Marrakech" } as const;

export type BookState = {
  error?: "invalid" | "unavailable" | "too_many" | "server" | "dates";
  reason?: string | null;
  fields?: string[];
  values?: Record<string, string>;
};

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};

export async function requestBooking(_prev: BookState, form: FormData): Promise<BookState> {
  const values = Object.fromEntries(
    ["firstName", "lastName", "email", "phone", "country", "arrivalTime", "bedSetup", "specialRequests"].map((k) => [k, str(form, k)]),
  );

  // honeypot: real people never see or fill this field
  if (str(form, "website")) return { error: "server", values };

  const locale = (routing.locales as readonly string[]).includes(str(form, "locale")) ? (str(form, "locale") as Locale) : "en";
  const { query } = parseStayQuery({ checkIn: str(form, "checkIn"), checkOut: str(form, "checkOut"), adults: str(form, "adults") });
  if (!query) return { error: "dates", values };

  const parsed = guestSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))], values };
  }

  let result;
  try {
    const extras = parseExtras((k) => str(form, k));
    const transferNote = extras.transfer
      ? `Transfert depuis Marrakech : ${PICKUP_FR[extras.transfer.from]}${extras.transfer.details ? ` (${extras.transfer.details})` : ""}`
      : undefined;
    result = await createBooking({ roomSlug: str(form, "room"), query, guest: parsed.data, locale, extras: { ...extras, transferNote } });
  } catch (e) {
    console.error("[booking] create failed", e);
    return { error: "server", values };
  }
  if (!result.ok) return { error: result.error, reason: result.error === "unavailable" ? result.reason : null, values };

  const id = result.id;
  after(() => sendBookingEmails(id));
  redirect(confirmationPath(locale, id));
}
