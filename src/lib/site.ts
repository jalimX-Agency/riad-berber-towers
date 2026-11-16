export const site = {
  name: "Riad Berber Towers",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://riadberbertowers.com",
  email: "riadberbertowers@gmail.com",
  phones: ["+212 661 283 086", "+212 670 414 623", "+212 524 484 691"],
  whatsapp: "212661283086",
  /** PayPal.me name for the deposit (env PAYPAL_ME, e.g. "riadberbertowers"). Empty: the payment page asks the guest to contact us. */
  paypalMe: (process.env.PAYPAL_ME ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?paypal\.me\//i, "")
    .replace(/\/.*$/, ""),
  address: {
    street: "Imlil Centre",
    locality: "Imlil, Asni",
    region: "Al Haouz",
    country: "MA",
  },
  altitudeM: 1740,
  fromMarrakechKm: 64,
  rooms: 7,
  /** the owner's travel agency: longer treks, Toubkal, desert and city tours */
  partner: { name: "Toubkal Peaks", url: "https://toubkal-peaks.com/" },
} as const;
