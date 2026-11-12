import { cn } from "@/lib/utils";

// One tile of the woven band from the base of the towers (48 x 34), used as a repeating CSS background.
// A CSS background avoids SVG <pattern> ids, which break when the same band appears twice on a page.
const tile = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="34" viewBox="0 0 48 34">` +
    `<rect width="48" height="34" fill="#4A3628"/>` +
    `<path d="M0 4H48M0 30H48" stroke="#6C7472" stroke-width="2"/>` +
    `<path d="M24 8 L33 17 L24 26 L15 17 Z" fill="none" stroke="#6C7472" stroke-width="2.4"/>` +
    `<path d="M24 13 L28 17 L24 21 L20 17 Z" fill="#B08A55"/>` +
    `<path d="M0 8 L9 17 L0 26 M48 8 L39 17 L48 26" fill="none" stroke="#6C7472" stroke-width="2.4"/>` +
    `</svg>`,
);

/** The woven band, used once per layout as a divider (brand book §07). */
export function WeaveBand({ className, height = 28 }: { className?: string; height?: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn("w-full bg-walnut", className)}
      style={{
        height,
        backgroundImage: `url("data:image/svg+xml,${tile}")`,
        backgroundRepeat: "repeat-x",
        backgroundSize: `${(height * 48) / 34}px ${height}px`,
      }}
    />
  );
}
