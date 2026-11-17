import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const r2Host = process.env.NEXT_PUBLIC_R2_URL ? new URL(process.env.NEXT_PUBLIC_R2_URL).hostname : undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: r2Host ? [{ protocol: "https", hostname: r2Host }] : [],
  },
  async redirects() {
    // Old PHP site (riad-berber-towers.com) -> new routes. Each old page goes to its own new page in ONE hop
    // (a chain of redirects loses ranking), and anything else on the old domain lands on the same path here.
    const NEW = "https://riadberbertowers.com";
    const OLD_HOST = [{ type: "host" as const, value: "(www\\.)?riad-berber-towers\\.com" }];
    // old room pages (/rooms/<old-slug>) and booking_details.php?room_id=N -> new room slugs
    const ROOM_SLUGS: Record<string, string> = {
      "targa-room": "targa",
      "suite-tarzout": "tarzoute",
      "suite-imlil": "imlil",
      "suite-toubkal": "toubkal",
      "suite-atlas": "atlas",
      "suite-taddart": "taddart",
      "suite-adrar": "adrar",
    };
    // room_id of the old site (read from its rooms.php links, Nov 2026): 1 Targa, 2 Adrar, 3 Imlil, 4 Toubkal, 5 Atlas, 6 Tarzoute, 7 Taddart
    const ROOM_IDS = ["targa", "adrar", "imlil", "toubkal", "atlas", "tarzoute", "taddart"];
    const paths: [string, string][] = [
      ["/rooms.php", "/rooms"],
      ["/contact.php", "/contact"],
      ["/index.php", "/"],
      ["/booking_confirm.php", "/rooms"],
      ...Object.entries(ROOM_SLUGS).map(([old, slug]) => [`/rooms/${old}`, `/rooms/${slug}`] as [string, string]),
    ];
    const byId = ROOM_IDS.map((slug, i) => ({ id: String(i + 1), slug }));
    return [
      // on the old domain: straight to the new domain
      ...byId.map(({ id, slug }) => ({
        source: "/booking_details.php",
        has: [...OLD_HOST, { type: "query" as const, key: "room_id", value: id }],
        destination: `${NEW}/rooms/${slug}`,
        permanent: true,
      })),
      ...paths.map(([source, to]) => ({ source, has: OLD_HOST, destination: `${NEW}${to}`, permanent: true })),
      { source: "/booking_details.php", has: OLD_HOST, destination: `${NEW}/rooms`, permanent: true },
      { source: "/:path*", has: OLD_HOST, destination: `${NEW}/:path*`, permanent: true },
      // the same old URLs if they reach this domain (old links, bookmarks)
      ...byId.map(({ id, slug }) => ({ source: "/booking_details.php", has: [{ type: "query" as const, key: "room_id", value: id }], destination: `/rooms/${slug}`, permanent: true })),
      ...paths.map(([source, destination]) => ({ source, destination, permanent: true })),
      { source: "/booking_details.php", destination: "/rooms", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
