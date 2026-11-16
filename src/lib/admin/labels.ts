import type { BedSetup, BookingSource, BookingStatus, PaymentStatus } from "@prisma/client";

// The admin is in French (the owner's working language).

export const statusLabel: Record<BookingStatus, string> = {
  PENDING: "Nouvelle demande",
  AWAITING_PAYMENT: "Paiement attendu",
  PAYMENT_REVIEW: "Paiement en vérification",
  CONFIRMED: "Confirmée",
  CHECKED_IN: "Arrivé",
  CHECKED_OUT: "Parti",
  CANCELLED: "Annulée",
  NO_SHOW: "Non présenté",
};

export const statusTone: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 ring-amber-300",
  AWAITING_PAYMENT: "bg-orange-50 text-orange-900 ring-orange-200",
  PAYMENT_REVIEW: "bg-violet-100 text-violet-900 ring-violet-300",
  CONFIRMED: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  CHECKED_IN: "bg-sky-100 text-sky-900 ring-sky-300",
  CHECKED_OUT: "bg-stone-100 text-stone-700 ring-stone-300",
  CANCELLED: "bg-rose-50 text-rose-800 ring-rose-200",
  NO_SHOW: "bg-rose-50 text-rose-800 ring-rose-200",
};

export const sourceLabel: Record<BookingSource, string> = {
  WEBSITE: "Site web",
  WHATSAPP: "WhatsApp",
  PHONE: "Téléphone",
  EMAIL: "Email",
  BOOKING_COM: "Booking.com",
  AIRBNB: "Airbnb",
  AGENCY: "Agence",
  WALK_IN: "Sans réservation",
};

export const paymentLabel: Record<PaymentStatus, string> = {
  UNPAID: "Non payé",
  DEPOSIT_PAID: "Acompte reçu",
  PAID: "Payé",
  REFUNDED: "Remboursé",
};

/**
 * Generic status buttons, by status. The payment flow has its own buttons on the booking page:
 * PENDING: accept (guest pays the deposit) or decline; PAYMENT_REVIEW: approve or reject the proof.
 */
export const nextStatuses: Record<BookingStatus, BookingStatus[]> = {
  PENDING: [],
  AWAITING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  PAYMENT_REVIEW: ["CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "NO_SHOW", "CANCELLED"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const actionLabel: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: "Confirmer sans preuve (payé autrement)",
  CANCELLED: "Annuler",
  CHECKED_IN: "Enregistrer l’arrivée",
  CHECKED_OUT: "Enregistrer le départ",
  NO_SHOW: "Non présenté",
};

export const frDate = (d: Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "UTC" }).format(d);

export const eur = (n: number | string, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(n));

export const bedLabel: Record<BedSetup, string> = {
  DOUBLE: "Un grand lit (king size)",
  TWIN: "Deux lits séparés",
};
