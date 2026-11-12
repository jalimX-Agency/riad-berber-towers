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
Fonts: Cormorant Garamond (display), Jost (text), Noto Naskh Arabic (Arabic).

## Notes

- Translations in `src/messages/` for FR, ES and AR are first drafts and need a native review.
- Booking engine rule: a room is available for a night when no non-cancelled booking and no `RoomBlock` covers it. Writes must run in a transaction to prevent double booking.
- On Windows, stop `npm run dev` before `prisma generate` (the query engine DLL is locked while the server runs).
