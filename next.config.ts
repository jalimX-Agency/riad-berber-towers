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
    // Old PHP site URLs (riad-berber-towers.com) -> new routes
    return [
      { source: "/rooms.php", destination: "/en/rooms", permanent: true },
      { source: "/contact.php", destination: "/en/contact", permanent: true },
      { source: "/index.php", destination: "/en", permanent: true },
      { source: "/booking_details.php", destination: "/en/rooms", permanent: true },
      { source: "/booking_confirm.php", destination: "/en/rooms", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
