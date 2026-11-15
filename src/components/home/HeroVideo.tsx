"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = { desktop: string; mobile: string; className?: string };

/**
 * Silent hero loop laid over the hero photo. It fades in only once it is actually playing, so the photo
 * stays the first paint (LCP) and nothing flashes on slow connections. Skipped for reduced motion and Save-Data.
 */
export function HeroVideo({ desktop, mobile, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const pick = () => {
      if (reduce.matches || saveData) return setSrc(null);
      setSrc(wide.matches ? desktop : mobile);
    };
    // the video (2-4 MB) must not compete with the hero photo, fonts and scripts:
    // start it only once the page has loaded and the main thread is idle
    let idle = 0;
    let timer = 0;
    const start = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) idle = w.requestIdleCallback(pick, { timeout: 2000 });
      else timer = window.setTimeout(pick, 300);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    reduce.addEventListener("change", pick);
    wide.addEventListener("change", pick);
    return () => {
      window.removeEventListener("load", start);
      if (idle) (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idle);
      clearTimeout(timer);
      reduce.removeEventListener("change", pick);
      wide.removeEventListener("change", pick);
    };
  }, [desktop, mobile]);

  // a new source starts hidden again until it plays
  useEffect(() => {
    setPlaying(false);
    const v = ref.current;
    if (!v || !src) return;
    v.play().catch(() => {}); // autoplay blocked (e.g. low-power mode): the photo simply stays
  }, [src]);

  if (!src) return null;
  return (
    <video
      ref={ref}
      key={src}
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
      onPlaying={() => setPlaying(true)}
      className={cn("pointer-events-none h-full w-full object-cover transition-opacity duration-1000", playing ? "opacity-100" : "opacity-0", className)}
    />
  );
}
