// npm run db:seed : rooms from the current site (riad-berber-towers.com, Nov 2026) + first admin.
// Descriptions are short English placeholders; real copy and FR/ES/AR come from the CMS.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Prices and floors from the owner (Nov 2026). Order = the owner's room numbers 1-7.
const rooms = [
  { slug: "targa", code: "TRG", name: "Targa Room", category: "standard", floor: 0, price: 72, view: "garden", order: 1, tagline: "Garden view and traditional charm", amenities: ["heated_floor", "private_bathroom", "wifi", "air_conditioning"] },
  { slug: "tarzoute", code: "TRZ", name: "Suite Tarzoute", category: "suite", floor: 0, price: 82, view: "village", order: 2, tagline: "Private terrace over the village and mountains", amenities: ["private_terrace", "heated_floor", "private_bathroom", "wifi"] },
  { slug: "imlil", code: "IML", name: "Suite Imlil", category: "suite", floor: 1, price: 82, view: "mountain", order: 3, tagline: "Mountains, garden and village views", amenities: ["heated_floor", "private_bathroom", "wifi", "coffee_maker"] },
  { slug: "toubkal", code: "TBK", name: "Suite Toubkal", category: "suite", floor: 1, price: 112, view: "mountain", order: 4, tagline: "Balcony with mountain, garden and village views", amenities: ["balcony", "heated_floor", "private_bathroom", "wifi"], featured: true },
  { slug: "atlas", code: "ATL", name: "Suite Atlas", category: "suite", floor: 1, price: 82, view: "garden", order: 5, tagline: "Balcony over the village and garden, tadelakt shower", amenities: ["balcony", "tadelakt_shower", "heated_floor", "wifi"] },
  { slug: "taddart", code: "TDR", name: "Suite Taddart", category: "suite", floor: 1, price: 92, view: "mountain", order: 6, tagline: "The widest panorama in the house", amenities: ["balcony", "heated_floor", "private_bathroom", "wifi"] },
  { slug: "adrar", code: "ADR", name: "Suite Adrar", category: "suite", floor: 2, price: 92, view: "mountain", order: 7, tagline: "Balcony with mountain and village views", amenities: ["balcony", "heated_floor", "private_bathroom", "wifi"] },
];

async function main() {
  // The old slug "tarzout" was renamed to "tarzoute" (owner's spelling)
  await db.room.updateMany({ where: { slug: "tarzout" }, data: { slug: "tarzoute" } });

  for (const r of rooms) {
    // Structural facts (name, price, floor, order) follow this file; descriptions edited in the CMS are kept
    const facts = { code: r.code, name: r.name, category: r.category, floor: r.floor, order: r.order, basePrice: r.price };
    await db.room.upsert({
      where: { slug: r.slug },
      update: facts,
      create: {
        slug: r.slug,
        ...facts,
        view: r.view,
        maxAdults: 2,
        featured: r.featured ?? false,
        amenities: r.amenities,
        images: [],
        translations: { create: [{ locale: "en", name: r.name, tagline: r.tagline }] },
      },
    });
    await db.roomTranslation.updateMany({ where: { room: { slug: r.slug }, locale: "en" }, data: { name: r.name } });
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
  } else {
    console.log("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set: no admin created.");
  }
  console.log(`Rooms: ${await db.room.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
