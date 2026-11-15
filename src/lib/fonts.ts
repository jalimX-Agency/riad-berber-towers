import localFont from "next/font/local";

// Self-hosted (src/fonts, from Google Fonts, OFL): the build never depends on fonts.googleapis.com.
// Latin subset covers EN/FR/ES/DE (é, ü, ß, ñ, €, ’); Arabic fonts carry the Arabic subset only.

export const cormorant = localFont({
  src: [
    { path: "../fonts/cormorant-garamond-latin-normal-500-600.woff2", weight: "500 600", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-italic-500-600.woff2", weight: "500 600", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const jost = localFont({
  src: [{ path: "../fonts/jost-latin-normal-300-500.woff2", weight: "300 500", style: "normal" }],
  variable: "--font-jost",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

// Arabic: hand-written ruqʿa for headings, IBM Plex Sans Arabic for text and UI
export const ruqaa = localFont({
  src: [
    { path: "../fonts/aref-ruqaa-arabic-normal-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/aref-ruqaa-arabic-normal-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-ruqaa",
  display: "swap",
  preload: false,
});

export const plexArabic = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-arabic-arabic-normal-300.woff2", weight: "300", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-normal-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-normal-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-arabic",
  display: "swap",
  preload: false,
});

// Meta voice: altitude, coordinates, counters, prices in tables
export const plexMono = localFont({
  src: [{ path: "../fonts/ibm-plex-mono-latin-normal-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-plex-mono",
  display: "swap",
  fallback: ["ui-monospace", "Consolas", "monospace"],
});

export const fontVariables = `${cormorant.variable} ${jost.variable} ${ruqaa.variable} ${plexArabic.variable} ${plexMono.variable}`;
