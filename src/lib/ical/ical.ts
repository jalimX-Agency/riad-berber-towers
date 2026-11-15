import { createHmac } from "node:crypto";
import { addDays, parseDay, toISO } from "@/lib/booking/dates";

export type IcalEvent = { uid: string; start: Date; end: Date; summary: string };

/**
 * Minimal VEVENT reader for Booking.com / Airbnb availability feeds.
 * They only carry all-day events (DTSTART;VALUE=DATE). A date-time is reduced to its calendar day.
 */
export function parseIcal(text: string): IcalEvent[] {
  // unfold continuation lines (RFC 5545: a line starting with space/tab continues the previous one)
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const events: IcalEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur) {
        const start = day(cur.DTSTART);
        const end = day(cur.DTEND) ?? (start ? addDays(start, 1) : null);
        if (start && end && end > start) events.push({ uid: cur.UID || `${toISO(start)}-${toISO(end)}`, start, end, summary: cur.SUMMARY ?? "" });
      }
      cur = null;
    } else if (cur) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const name = line.slice(0, i).split(";")[0].toUpperCase();
      cur[name] = line.slice(i + 1).trim();
    }
  }
  return events;
}

function day(v?: string) {
  const m = v?.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? parseDay(`${m[1]}-${m[2]}-${m[3]}`) : null;
}

const ics = (d: Date) => toISO(d).replace(/-/g, "");
const escape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** All-day events for one room, for Booking.com / Airbnb to import. */
export function buildIcal(name: string, events: { uid: string; start: Date; end: Date; summary: string }[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Riad Berber Towers//Availability//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.uid}@riadberbertowers.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ics(e.start)}`,
      `DTEND;VALUE=DATE:${ics(e.end)}`,
      `SUMMARY:${escape(e.summary)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Unguessable, stable token for a room's export URL (changes only if the secret changes). */
export function exportToken(slug: string) {
  const secret = process.env.ICAL_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("ICAL_SECRET or NEXTAUTH_SECRET is required for iCal export");
  return createHmac("sha256", secret).update(`ical:${slug}`).digest("hex").slice(0, 32);
}

/** Only public https URLs: an admin-entered feed must not make the server call internal addresses. */
export function isSafeFeedUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":")) return false; // raw IPv4 / IPv6
    return true;
  } catch {
    return false;
  }
}
