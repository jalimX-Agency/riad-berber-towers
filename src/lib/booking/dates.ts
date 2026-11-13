// Stay dates are calendar days (no time zone). They are handled as UTC midnight Dates,
// matching Postgres @db.Date columns. Strings are always "YYYY-MM-DD".

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

export function parseDay(value: string | null | undefined): Date | null {
  if (!value || !ISO.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || toISO(d) !== value ? null : d;
}

export const toISO = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
export const nightsBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY);

/** Today in Morocco (Africa/Casablanca), as a UTC-midnight Date. */
export function todayInImlil(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date());
  return parseDay(iso)!;
}

/** Every night of the stay: checkIn, checkIn+1, ... checkOut-1. */
export function eachNight(checkIn: Date, checkOut: Date): Date[] {
  const n = nightsBetween(checkIn, checkOut);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(checkIn, i));
}
