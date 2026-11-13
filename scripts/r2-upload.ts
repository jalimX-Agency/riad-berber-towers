// Upload the website photos to Cloudflare R2, keeping their keys (rooms/toubkal/01.webp ...).
// Usage: npx tsx --env-file=.env scripts/r2-upload.ts "<folder with the webp files>"
// The folder is media/site-photos/web in the client's Documents folder.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME in .env first.");
  process.exit(1);
}
const root = process.argv[2];
if (!root) {
  console.error("Pass the folder that contains rooms/ and site/.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const types: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".avif": "image/avif" };

async function* walk(dir: string): AsyncGenerator<string> {
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name);
    if ((await stat(p)).isDirectory()) yield* walk(p);
    else if (types[path.extname(name).toLowerCase()]) yield p;
  }
}

(async () => {
  let n = 0;
  for await (const file of walk(root)) {
    const key = path.relative(root, file).split(path.sep).join("/");
    const body = await readFile(file);
    // retry transient network/TLS errors (EPROTO, ECONNRESET) with a short backoff
    for (let attempt = 1; ; attempt++) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: types[path.extname(file).toLowerCase()],
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
        break;
      } catch (err) {
        if (attempt >= 4) throw err;
        console.warn(`retry ${attempt} for ${key}: ${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    console.log("uploaded", key);
    n++;
  }
  console.log(`Done: ${n} files. Now set NEXT_PUBLIC_R2_URL in .env / Vercel.`);
})();
