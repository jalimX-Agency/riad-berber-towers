"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `onProgress` with 0 → 1 as `target` scrolls from "its top at the viewport top" to
 * "its bottom at the viewport bottom" (the range of a sticky/pinned section).
 * One passive scroll listener, throttled to animation frames; no animation library needed.
 */
export function useScrollProgress(target: RefObject<HTMLElement | null>, onProgress: (p: number) => void) {
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = target.current;
      if (!el || el.offsetParent === null) return; // hidden (phones / reduced motion use the static layout)
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      cb.current(range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [target]);
}
