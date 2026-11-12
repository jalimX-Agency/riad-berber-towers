import { Cormorant_Garamond, Jost, Aref_Ruqaa, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";

export const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const jost = Jost({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

// Arabic: hand-written ruqʿa for headings, IBM Plex Sans Arabic for text and UI
export const ruqaa = Aref_Ruqaa({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-ruqaa",
  display: "swap",
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500"],
  variable: "--font-plex-arabic",
  display: "swap",
});

// Meta voice: altitude, coordinates, counters, prices in tables
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const fontVariables = `${cormorant.variable} ${jost.variable} ${ruqaa.variable} ${plexArabic.variable} ${plexMono.variable}`;
