import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Search engines and AI assistants (ChatGPT, Perplexity, Claude, Gemini, Copilot…) may read every public page.
 * Private areas stay out: the admin, the API, booking steps and payment links.
 */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/admin", "/api/", "/book", "/*/book"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      // named explicitly so a future blanket rule can't shut AI search out by accident
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "Google-Extended", "Applebot-Extended", "Bingbot"],
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
