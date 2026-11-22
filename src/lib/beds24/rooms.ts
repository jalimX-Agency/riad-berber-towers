// How the riad's rooms map to Beds24 (property 369451). Prices live in Beds24 rows, one row per sales channel:
//   price1 = "Booking + site (EUR)"  → Booking.com   (euros)
//   price2 = "Airbnb"                → Airbnb        (euros since 2026-11-22; dirhams before)
// Add a channel later (Expedia…) by creating its price row in Beds24 and listing it here.

export const BEDS24_PROPERTY_ID = 369451;

/** room slug → Beds24 room id */
export const BEDS24_ROOMS: Record<string, number> = {
  imlil: 760566,
  targa: 760567,
  tarzoute: 760568,
  toubkal: 760569,
  atlas: 760570,
  taddart: 760571,
  adrar: 760572,
};

export type PriceField = "price1" | "price2";

export type ChannelDef = {
  key: "booking" | "airbnb";
  label: string;
  /** Beds24 calendar field holding this channel's nightly price */
  priceField: PriceField;
  currency: "EUR" | "MAD";
  symbol: string;
  /** Beds24 `channel` value on imported bookings */
  bookingChannel: string;
};

export const CHANNELS: ChannelDef[] = [
  { key: "booking", label: "Booking.com", priceField: "price1", currency: "EUR", symbol: "€", bookingChannel: "booking" },
  { key: "airbnb", label: "Airbnb", priceField: "price2", currency: "EUR", symbol: "€", bookingChannel: "airbnb" },
];

export const channelByKey = (k: string) => CHANNELS.find((c) => c.key === k);

export const beds24RoomId = (slug: string) => BEDS24_ROOMS[slug] ?? null;
export const slugByBeds24Room = (id: number) => Object.entries(BEDS24_ROOMS).find(([, v]) => v === id)?.[0] ?? null;

/** Bookings the site pushed to Beds24 carry its own reference (RBT-XXXXXX) in apiReference; pulls skip them. */
export const SITE_REF_PREFIX = "RBT-";
/** Booking.com / Airbnb reservations mirrored from Beds24 into the site: reference "B24-<beds24 booking id>". */
export const OTA_REF_PREFIX = "B24-";
export const isOtaReference = (ref: string) => ref.startsWith(OTA_REF_PREFIX);
export const CLOSURE_PREFIX = "b24:";
