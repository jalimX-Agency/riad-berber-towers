"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = { images: string[]; alt: string; href: string; sizes: string; priority?: boolean; className?: string; max?: number };

/**
 * Swipeable photo carousel for a room card: CSS scroll-snap (native swipe on phones),
 * arrows on hover, dots. Every slide links to the room. RTL-aware.
 */
export function CardCarousel({ images, alt, href, sizes, priority, className, max = 6 }: Props) {
  const t = useTranslations("rooms");
  const list = images.slice(0, max);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Visible slide from the scroll position (abs() covers RTL, where scrollLeft is negative)
  function onScroll() {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.min(list.length - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)));
  }

  function go(i: number) {
    const el = track.current;
    const target = el?.querySelector<HTMLElement>(`[data-i="${(i + list.length) % list.length}"]`);
    if (!el || !target) return;
    // the track is the slides' offsetParent: offsetLeft is the scroll position (negative in RTL), and the page never scrolls
    el.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
  }

  if (!list.length) return <div className={cn("bg-walnut", className)} />;

  const arrow =
    "absolute top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-snow/90 text-ink shadow-sm transition-opacity hover:bg-snow focus-visible:opacity-100 md:opacity-0 md:group-hover/car:opacity-100";

  return (
    <div className={cn("group/car relative overflow-hidden bg-walnut", className)} role="region" aria-roledescription="carousel" aria-label={alt}>
      <div
        ref={track}
        onScroll={onScroll}
        className="relative flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((src, i) => (
          <Link
            key={src}
            href={href}
            data-i={i}
            className="relative block h-full w-full shrink-0 snap-start"
            aria-label={`${alt} · ${t("photoOf", { current: i + 1, total: list.length })}`}
            tabIndex={i === index ? 0 : -1}
          >
            <Image src={src} alt="" fill sizes={sizes} className="object-cover" priority={priority && i === 0} loading={priority && i === 0 ? undefined : "lazy"} />
          </Link>
        ))}
      </div>

      {list.length > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} className={cn(arrow, "start-2")} aria-label={t("prevPhoto")}>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => go(index + 1)} className={cn(arrow, "end-2")} aria-label={t("nextPhoto")}>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1.5" aria-hidden="true">
            {list.map((src, i) => (
              <span key={src} className={cn("h-1.5 rounded-full bg-snow transition-all", i === index ? "w-4 opacity-100" : "w-1.5 opacity-60")} />
            ))}
          </div>
          <span className="pointer-events-none absolute end-2.5 top-2.5 z-10 rounded-full bg-ink/60 px-2 py-0.5 font-mono text-[11px] text-snow" dir="ltr">
            {index + 1}/{list.length}
          </span>
        </>
      )}
    </div>
  );
}
