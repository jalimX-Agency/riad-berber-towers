# Riad Berber Towers

Website and in-house booking system for Riad Berber Towers, a 7-room guesthouse in Imlil (High Atlas, Morocco).
Primary domain: **riadberbertowers.com** (the old riad-berber-towers.com redirects here).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS 4, brand tokens in `src/app/globals.css` |
| i18n | next-intl, URL prefixes `/en /fr /es /ar` (Arabic is RTL) |
| Database | Neon PostgreSQL via Prisma 6 (branch `dev` for local work, `main` for production) |
| Auth | NextAuth 4 (credentials, admin only) |
| Images | Cloudflare R2 |
| Email | Resend |
| Forms | React Hook Form + Zod |

## First run

Requires Node 20+ and a Neon project with a `dev` branch.

```bash
npm install
```

```bash
cp .env.example .env    # fill DATABASE_URL + DIRECT_URL (Neon dev branch), NEXTAUTH_SECRET, SEED_ADMIN_PASSWORD
```

```bash
npm run db:push         # creates the tables
```

```bash
npm run db:seed         # 7 rooms from the current site + first admin
```

```bash
npm run dev             # http://localhost:3000/en, admin at /admin
```

## Project map

```
prisma/schema.prisma     rooms, translations, rates, blocks, iCal feeds, bookings, extras, content, admin
prisma/seed.ts           seed data
public/                  favicons, og-image, public/brand/ logo SVGs (optimized)
src/app/[locale]/        public site (one layout per locale, sets lang and dir)
src/app/admin/           admin area (own layout, protected by NextAuth)
src/app/api/             API routes (auth now; bookings, admin CRUD next)
src/i18n/                routing, request config, navigation helpers
src/messages/            en.json fr.json es.json ar.json
src/lib/                 db, auth, fonts, site constants, utils
```

## Brand

Brand book: https://claude.ai/artifact/6rwnj1N2X5nG4eBRQDnV6r
Full logo package (all formats) and brand book source live outside this repo, in the client media folder.

Colours: Imlil Earth `#955738`, Walnut Beam `#4A3628`, Cedar Ink `#2F2016`, Granite Seguia `#6C7472`, Autumn Walnut `#B08A55`, Tadelakt Lime `#EEE7D6`, Toubkal Snow `#F7F3EA`.
Fonts: Cormorant Garamond (display), Jost (text), Aref Ruqaa (Arabic headings), IBM Plex Sans Arabic (Arabic text).

## Photos and R2

- The database stores image **keys** (`photos/rooms/toubkal/dsc00075-2.webp`). `src/lib/media.ts` turns a key into a URL:
  `NEXT_PUBLIC_R2_URL/<key>` when R2 is configured, otherwise `/media/<key>` from the local, uncommitted `public/media` folder.
- Photo shoot (Nov 2026): the photographer's web JPGs are in the client folder `media/photos-2026-11` (room folders `room 1`–`room 7` follow the owner's order: Targa, Tarzoute, Imlil, Toubkal, Atlas, Taddart, Adrar).
  `scripts/process-photos.ts` converts them to 1920 px WebP in `media/photos-2026-11-web` with a `manifest.json`; upload that folder with `scripts/r2-upload.ts`.
- `prisma/media-manifest.json`: `rooms` = the chosen photos per room (cover first), `library` = every photo. The seed applies `rooms` to rooms that have no photos or still have the old site's (`rooms/...`) photos.
- Keys are never reused for different content (R2 objects are cached as immutable), so a new shoot gets new keys.

## Admin

- `/admin` (French): dashboard, bookings (confirm / cancel / arrival / departure, payment, notes, guest emails), manual bookings, calendar, prices and seasonal rates, room closures, Booking.com / Airbnb sync.
- Prices are managed in `/admin/rates`; the seed sets a room's base price only when it creates the room.
- Booking flow: request (Nouvelle demande) → the riad accepts (the guest gets a link to /book/pay/<token>: PayPal deposit of 40% + upload of the payment proof) or declines ("no room available" email) → proof uploaded (Paiement en vérification, the riad is notified) → the riad approves (confirmation email with the PDF voucher) or rejects the proof (the guest uploads again).
- House rules live in `src/lib/booking/policy.ts`: 2 guests per room, Suite Toubkal 3 with +10%, adults only, 40% non-refundable deposit, balance in cash (MAD, USD, EUR, GBP).
- `/admin/settings` (owner and admins): the PayPal.me name used on the payment page and the email that receives new requests and payment proofs. `PAYPAL_ME` / `EMAIL_ADMIN` in .env are only fallbacks.
- Payment proofs are stored in the database (PaymentProof), not on the public CDN, and served only to signed-in users.
- iCal: each room has a signed export link (`/api/ical/<slug>-<token>.ics`) to paste in Booking.com and Airbnb, and the platforms' own iCal links are imported as closures. Copy the export links from the **production** admin: they depend on `NEXT_PUBLIC_SITE_URL` and `ICAL_SECRET`.
- Scheduled import: `GET /api/cron/ical` with `Authorization: Bearer $CRON_SECRET`. On Vercel add a cron in `vercel.json` (every 30–60 min needs the Pro plan; Hobby allows once a day) or use an external scheduler such as cron-job.org. The admin also has a "Synchroniser maintenant" button.

## Notes

- Translations in `src/messages/` for FR, ES and AR are first drafts and need a native review.
- Booking engine rule: a room is available for a night when no non-cancelled booking and no `RoomBlock` covers it. Writes must run in a transaction to prevent double booking.
- On Windows, stop `npm run dev` before `prisma generate` (the query engine DLL is locked while the server runs).
