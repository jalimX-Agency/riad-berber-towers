// Convert a folder of JPG photos to web-ready WebP (1920 px long edge) with a manifest.
// Usage: node node_modules/tsx/dist/cli.mjs scripts/process-photos.ts <src> <out> [prefix]
// Folder names become key segments: "Rooms/room 1/DSC00348.jpg" -> "photos/rooms/targa/dsc00348.webp".
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [src, out, prefix = "photos"] = process.argv.slice(2);
if (!src || !out) throw new Error("usage: process-photos.ts <src> <out> [prefix]");

// Photographer's room numbers -> our room slugs (confirmed by the owner)
const ROOMS: Record<string, string> = { "1": "targa", "2": "tarzoute", "3": "imlil", "4": "toubkal", "5": "atlas", "6": "taddart", "7": "adrar" };

const slugify = (s: string) => {
  const room = s.match(/^room\s*(\d+)$/i);
  if (room && ROOMS[room[1]]) return ROOMS[room[1]];
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
};

const files: string[] = [];
(function walk(d: string) {
  for (const f of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.jpe?g$/i.test(f.name)) files.push(p);
  }
})(src);

type Entry = { key: string; w: number; h: number; source: string };
const manifest: Entry[] = [];

async function convert(file: string) {
  const rel = path.relative(src, path.dirname(file)).split(path.sep).filter(Boolean).map(slugify);
  const name = path.basename(file).replace(/\.jpe?g$/i, "").toLowerCase();
  const key = [prefix, ...rel, `${name}.webp`].join("/");
  const dest = path.join(out, ...key.split("/"));
  mkdirSync(path.dirname(dest), { recursive: true });
  const info = await sharp(file)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toFile(dest);
  manifest.push({ key, w: info.width, h: info.height, source: path.relative(src, file).split(path.sep).join("/") });
}

(async () => {
  const queue = [...files];
  let done = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        await convert(f);
        if (++done % 25 === 0) console.log(`${done}/${files.length}`);
      }
    }),
  );
  manifest.sort((a, b) => a.key.localeCompare(b.key));
  writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 1));
  console.log(`done: ${manifest.length} photos -> ${out}`);
})();
