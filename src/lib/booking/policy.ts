// House rules from the owner (15 Nov 2026). Pure values: safe to import from client components.

/** Guests a room is priced for. Above this (only rooms with maxAdults > 2, e.g. Suite Toubkal) a surcharge applies. */
export const STANDARD_OCCUPANCY = 2;
/** Highest maxAdults of any room: the guest selects never offer more. */
export const MAX_GUESTS = 3;
/** Surcharge on every night when the stay has more than STANDARD_OCCUPANCY adults. */
export const EXTRA_GUEST_PERCENT = 10;
/** Children under 12 are not accepted (guests aged 12+ book as adults, so the engine never counts children). */
export const CHILDREN_ALLOWED = false;
/** Advance needed to confirm a booking, non-refundable. */
export const DEPOSIT_PERCENT = 20;
/** The balance is paid in cash on arrival, in one of these currencies. */
export const CASH_CURRENCIES = ["MAD", "EUR", "USD", "GBP"] as const;

export const withExtraGuest = (price: number, adults: number) =>
  adults > STANDARD_OCCUPANCY ? Math.round(price * (1 + EXTRA_GUEST_PERCENT / 100)) : price;

/** Deposit and balance for a total, rounded to whole units like the room prices. */
export function splitPayment(total: number) {
  const deposit = Math.round((total * DEPOSIT_PERCENT) / 100);
  return { deposit, balance: Math.max(0, total - deposit) };
}

/** Payment proof upload limit. Vercel caps a function request body at 4.5 MB. */
export const MAX_PROOF_BYTES = 4 * 1024 * 1024;

/** Every room can be set up with one king-size bed or two separate beds: the guest chooses. */
export const BED_SETUPS = ["DOUBLE", "TWIN"] as const;
export type BedChoice = (typeof BED_SETUPS)[number];

/** Longest stay bookable online (the server checks it too, see MAX_NIGHTS in availability.ts). */
export const MAX_NIGHTS_CLIENT = 30;
