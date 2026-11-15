import { mediaUrl } from "@/lib/media";

/** Photos used on the home page (Nov 2026 shoot, keys in R2). Width/height are the stored WebP sizes. */
const p = (key: string, w: number, h: number) => ({ src: mediaUrl(`photos/${key}`), w, h });

export const homeMedia = {
  heroMobile: p("outside-day/dsc00473-modifier.webp", 1280, 1920),
  heroDesktop: p("outside-day/dji_20250428172039_0306_d.webp", 1920, 1080),
  climb: {
    ground: p("living-room/dsc00436.webp", 1920, 1280),
    first: p("inside/dsc00380.webp", 1920, 1280),
    second: p("inside/dsc00368.webp", 1920, 1280),
    roof: p("outside-night/dji_20250429201942_0453_d-enhanced-nr-modifier.webp", 1920, 1080),
  },
  teaPortrait: p("tea-man/dsc00458.webp", 1280, 1920),
  teaDetail: p("tea-man/dsc00470.webp", 1920, 1280),
  strip: {
    salon: p("living-room/dsc00430.webp", 1920, 1280),
    gallery: p("inside/dsc00364.webp", 1920, 1280),
    skylight: p("inside/dsc00401.webp", 1920, 1280),
    stairs: p("reception/dsc00415.webp", 1920, 1280),
    fountain: p("inside/dsc00375.webp", 1920, 1280),
  },
  valley: p("outside-day/dji_20250428172232_0312_d.webp", 1920, 1080),
  /** Hero loop (morning drone → fountain → tea → night terrace), silent, ~15 s. Bump -vN when re-encoding (cached immutable). */
  heroVideo: { desktop: mediaUrl("video/hero-desktop-v2.mp4"), mobile: mediaUrl("video/hero-mobile-v2.mp4") },
} as const;

export type Photo = { src: string; w: number; h: number };
