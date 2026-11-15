// npm run db:seed : rooms (facts, copy in 4 languages, photos) + first admin.
// Facts (name, price, floor, order) always follow this file.
// Copy and photos are written only when empty, so edits made in the admin are kept.
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Locale } from "@prisma/client";
import bcrypt from "bcryptjs";
import { roomCopy } from "./data/rooms-content";

const db = new PrismaClient();

// Photo keys (WebP on R2, or public/media in dev). rooms = chosen photos per room, cover first;
// library = every photo from the Nov 2026 shoot (made by scripts/process-photos.ts).
type Media = { key: string; w: number; h: number };
const manifest = JSON.parse(readFileSync(path.join(__dirname, "media-manifest.json"), "utf8")) as {
  rooms: Record<string, Media[]>;
  library?: Media[];
};

// Prices and floors from the owner (Nov 2026). Order = the owner's room numbers 1-7.
const rooms = [
  { slug: "targa", code: "TRG", name: "Targa Room", category: "standard", floor: 0, price: 72, view: "garden", order: 1, amenities: ["heated_floor", "tadelakt_walls", "zellij_shower", "private_bathroom", "wifi"] },
  { slug: "tarzoute", code: "TRZ", name: "Suite Tarzoute", category: "suite", floor: 0, price: 82, view: "village", order: 2, amenities: ["private_terrace", "heated_floor", "tadelakt_walls", "zellij_shower", "private_bathroom", "wifi"] },
  { slug: "imlil", code: "IML", name: "Suite Imlil", category: "suite", floor: 1, price: 82, view: "mountain", order: 3, amenities: ["heated_floor", "tadelakt_walls", "zellij_shower", "private_bathroom", "wifi", "coffee_maker"] },
  { slug: "toubkal", code: "TBK", name: "Suite Toubkal", category: "suite", floor: 1, price: 112, view: "mountain", order: 4, amenities: ["balcony", "heated_floor", "tadelakt_walls", "zellij_shower", "private_bathroom", "wifi"], featured: true },
  { slug: "atlas", code: "ATL", name: "Suite Atlas", category: "suite", floor: 1, price: 82, view: "garden", order: 5, amenities: ["balcony", "heated_floor", "tadelakt_walls", "zellij_shower", "private_bathroom", "wifi"] },
  { slug: "taddart", code: "TDR", name: "Suite Taddart", category: "suite", floor: 1, price: 92, view: "mountain", order: 6, amenities: ["balcony", "heated_floor", "tadelakt_walls", "zellij_shower", "private_bathroom", "wifi"] },
  { slug: "adrar", code: "ADR", name: "Suite Adrar", category: "suite", floor: 2, price: 92, view: "mountain", order: 7, amenities: ["balcony", "heated_floor", "tadelakt_walls", "zellij_shower", "private_bathroom", "wifi"] },
];

const locales: Locale[] = ["en", "fr", "es", "ar"];

async function main() {
  // The old slug "tarzout" was renamed to "tarzoute" (owner's spelling)
  await db.room.updateMany({ where: { slug: "tarzout" }, data: { slug: "tarzoute" } });

  for (const r of rooms) {
    // basePrice is only set when a room is created: after that the owner manages prices in /admin/rates
    const facts = { code: r.code, name: r.name, category: r.category, floor: r.floor, order: r.order };
    const photos = (manifest.rooms[r.slug] ?? []).map((m) => m.key);

    const room = await db.room.upsert({
      where: { slug: r.slug },
      update: facts,
      create: {
        slug: r.slug,
        ...facts,
        basePrice: r.price,
        view: r.view,
        maxAdults: 2,
        featured: r.featured ?? false,
        amenities: r.amenities,
        coverImage: photos[0] ?? "",
        images: photos,
      },
    });

    // photos: set when the room has none, or still has the old site's photos ("rooms/..." keys,
    // replaced by the Nov 2026 photo shoot under "photos/..."); never touch a selection made later
    const legacy = room.images.length > 0 && room.images.every((k) => k.startsWith("rooms/"));
    if ((room.images.length === 0 || legacy) && photos.length) {
      await db.room.update({ where: { id: room.id }, data: { images: photos, coverImage: photos[0] } });
    }
    // amenities: keep the list in sync with this file until the admin manages them
    await db.room.update({ where: { id: room.id }, data: { amenities: r.amenities, view: r.view } });

    // copy: create missing languages, fill empty descriptions, never overwrite edited text
    for (const locale of locales) {
      const copy = roomCopy[r.slug]?.[locale];
      if (!copy) continue;
      const existing = await db.roomTranslation.findUnique({ where: { roomId_locale: { roomId: room.id, locale } } });
      if (!existing) {
        await db.roomTranslation.create({ data: { roomId: room.id, locale, ...copy } });
      } else if (!existing.description) {
        await db.roomTranslation.update({ where: { id: existing.id }, data: copy });
      }
    }
  }

  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name: "Admin", role: "OWNER", password: await bcrypt.hash(password, 12) },
    });
    console.log(`Admin ready: ${email}`);
  }
  const [roomCount, tr] = await Promise.all([db.room.count(), db.roomTranslation.count()]);
  console.log(`Rooms: ${roomCount}, translations: ${tr}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
