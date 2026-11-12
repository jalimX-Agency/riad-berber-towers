// npm run db:seed : rooms from the current site (riad-berber-towers.com, Nov 2026) + first admin.
// Descriptions are short English placeholders; real copy and FR/ES/AR come from the CMS.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const rooms = [
  { slug: "targa", code: "TRG", name: "Targa Room", price: 62, view: "garden", order: 1, tagline: "Garden view and traditional charm", amenities: ["heated_floor", "private_bathroom", "wifi", "air_conditioning"] },
  { slug: "tarzout", code: "TRZ", name: "Suite Tarzout", price: 72, view: "village", order: 2, tagline: "Private terrace over the village and mountains", amenities: ["private_terrace", "heated_floor", "private_bathroom", "wifi"] },
  { slug: "adrar", code: "ADR", name: "Suite Adrar", price: 82, view: "mountain", order: 3, tagline: "Balcony with mountain and village views", amenities: ["balcony", "heated_floor", "private_bathroom", "wifi"] },
  { slug: "imlil", code: "IML", name: "Suite Imlil", price: 82, view: "mountain", order: 4, tagline: "Mountains, garden and village views", amenities: ["heated_floor", "private_bathroom", "wifi", "coffee_maker"] },
  { slug: "atlas", code: "ATL", name: "Suite Atlas", price: 82, view: "garden", order: 5, tagline: "Balcony over the village and garden, tadelakt shower", amenities: ["balcony", "tadelakt_shower", "heated_floor", "wifi"] },
  { slug: "taddart", code: "TDR", name: "Suite Taddart", price: 82, view: "mountain", order: 6, tagline: "The widest panorama in the house", amenities: ["balcony", "heated_floor", "private_bathroom", "wifi"] },
  { slug: "toubkal", code: "TBK", name: "Suite Toubkal", price: 92, view: "mountain", order: 7, tagline: "Balcony with mountain, garden and village views", amenities: ["balcony", "heated_floor", "private_bathroom", "wifi"], featured: true },
];

async function main() {
  for (const r of rooms) {
    await db.room.upsert({
      where: { slug: r.slug },
      update: {},
      create: {
        slug: r.slug,
        code: r.code,
        name: r.name,
        order: r.order,
        basePrice: r.price,
        view: r.view,
        maxAdults: 2,
        featured: r.featured ?? false,
        amenities: r.amenities,
        images: [],
        translations: { create: [{ locale: "en", name: r.name, tagline: r.tagline }] },
      },
    });
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
