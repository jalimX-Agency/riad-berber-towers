// Filters of the admin bookings list. Shared by the server page (reads the URL) and the client list
// (filters in the browser and writes the URL back). Plain data only: safe in client components.

export type SortKey = "booked-desc" | "booked-asc" | "arrival-asc" | "arrival-desc" | "total-desc";

export type Filters = {
  q: string;
  statuses: string[];
  room: string;
  source: string;
  payment: string;
  bed: string;
  /** arrival (check-in) between, YYYY-MM-DD */
  arrFrom: string;
  arrTo: string;
  /** reservation date between, YYYY-MM-DD */
  bookFrom: string;
  bookTo: string;
  sort: SortKey;
};

export const DEFAULT_SORT: SortKey = "booked-desc";

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "booked-desc", label: "Réservation : plus récentes" },
  { value: "booked-asc", label: "Réservation : plus anciennes" },
  { value: "arrival-asc", label: "Arrivée : plus proche" },
  { value: "arrival-desc", label: "Arrivée : plus lointaine" },
  { value: "total-desc", label: "Montant : plus élevé" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const day = (v?: string) => (v && ISO.test(v) ? v : "");

/** URL → filters (unknown values are dropped). `status` (single) is still accepted for old links. */
export function parseFilters(sp: Record<string, string | undefined>): Filters {
  const sort = SORTS.some((s) => s.value === sp.sort) ? (sp.sort as SortKey) : DEFAULT_SORT;
  const statuses = (sp.st ?? sp.status ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[A-Z_]{3,20}$/.test(s));
  return {
    q: (sp.q ?? "").trim().slice(0, 80),
    statuses,
    room: (sp.room ?? "").slice(0, 40),
    source: /^[A-Z_]{2,20}$/.test(sp.src ?? "") ? sp.src! : "",
    payment: /^[A-Z_]{2,20}$/.test(sp.pay ?? "") ? sp.pay! : "",
    bed: sp.bed === "DOUBLE" || sp.bed === "TWIN" ? sp.bed : "",
    arrFrom: day(sp.af),
    arrTo: day(sp.at),
    bookFrom: day(sp.bf),
    bookTo: day(sp.bt),
    sort,
  };
}

/** Filters → URL params (defaults left out, so a plain list keeps a clean URL). */
export function filterParams(f: Filters, view: string) {
  const p = new URLSearchParams();
  if (view !== "upcoming") p.set("view", view);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.statuses.length) p.set("st", f.statuses.join(","));
  if (f.room) p.set("room", f.room);
  if (f.source) p.set("src", f.source);
  if (f.payment) p.set("pay", f.payment);
  if (f.bed) p.set("bed", f.bed);
  if (f.arrFrom) p.set("af", f.arrFrom);
  if (f.arrTo) p.set("at", f.arrTo);
  if (f.bookFrom) p.set("bf", f.bookFrom);
  if (f.bookTo) p.set("bt", f.bookTo);
  if (f.sort !== DEFAULT_SORT) p.set("sort", f.sort);
  return p;
}
