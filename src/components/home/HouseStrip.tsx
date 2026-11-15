"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/home-media";
import { useScrollProgress } from "@/lib/use-scroll-progress";

export type StripItem = { id: string; title: string; text: string; photo: Photo };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Signature 2, "the gallery walk": on large screens vertical scroll walks a horizontal row of rooms
 * of the house. Phones (and reduced motion) get a native swipe row with snap points.
 */
export function HouseStrip({ items, rtl }: { items: StripItem[]; rtl: boolean }) {
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [current, setCurrent] = useState(1);

  // how far the track must travel so its last panel ends at the viewport edge
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setDistance(Math.max(0, el.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // the track and the bar are moved directly (no re-render per frame); only the counter goes through state
  const bar = useRef<HTMLSpanElement>(null);
  useScrollProgress(section, (v) => {
    if (track.current) track.current.style.transform = `translate3d(${(rtl ? 1 : -1) * v * distance}px, 0, 0)`;
    if (bar.current) bar.current.style.transform = `scaleX(${v})`;
    setCurrent(Math.min(items.length, Math.floor(v * items.length) + 1));
  });

  // swipe row: keep the counter in sync with the panel in view
  const row = useRef<HTMLUListElement>(null);
  const [swiped, setSwiped] = useState(1);
  const onRowScroll = () => {
    const el = row.current;
    if (!el || !el.firstElementChild) return;
    const w = (el.firstElementChild as HTMLElement).offsetWidth + 12;
    setSwiped(Math.min(items.length, Math.round(Math.abs(el.scrollLeft) / w) + 1));
  };

  const caption = (it: StripItem, i: number) => (
    <figcaption className="grid gap-1 pt-3">
      <span className="meta w-fit text-ochre" dir="ltr">
        {pad(i + 1)} / {pad(items.length)}
      </span>
      <span className="font-display text-2xl text-snow [html[dir=rtl]_&]:font-arabic-display [html[dir=rtl]_&]:text-xl">{it.title}</span>
      <span className="max-w-[34ch] text-sm text-snow/70">{it.text}</span>
    </figcaption>
  );

  return (
    <>
      {/* swipe row: phones, tablets, reduced motion */}
      <div className="strip-swipe">
        <ul
          ref={row}
          onScroll={onRowScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((it, i) => (
            <li key={it.id} className="w-[82vw] max-w-[440px] shrink-0 snap-center">
              <figure>
                <div className="relative aspect-[4/5] overflow-hidden rounded-card">
                  <Image src={it.photo.src} alt={it.title} fill sizes="82vw" className="object-cover" />
                </div>
                {caption(it, i)}
              </figure>
            </li>
          ))}
        </ul>
        <div className="container-site mt-4 flex items-center gap-3" aria-hidden="true">
          {items.map((it, i) => (
            <span key={it.id} className={`h-px flex-1 transition-colors ${i < swiped ? "bg-ochre" : "bg-snow/20"}`} />
          ))}
        </div>
      </div>

      {/* scroll-driven row: large screens with motion allowed */}
      <div ref={section} className="strip-pin relative" style={{ height: `calc(100svh + ${distance}px)` }}>
        <div className="sticky top-0 flex h-svh flex-col justify-center gap-8 overflow-hidden pt-[80px]">
          <div ref={track} className="flex w-max gap-6 px-[max(20px,calc((100vw-1240px)/2+20px))] will-change-transform">
            {items.map((it, i) => (
              <figure key={it.id} className="shrink-0">
                <div className="relative overflow-hidden rounded-card" style={{ height: "52svh", aspectRatio: `${it.photo.w} / ${it.photo.h}` }}>
                  <Image src={it.photo.src} alt={it.title} fill sizes="60vw" className="object-cover" />
                </div>
                {caption(it, i)}
              </figure>
            ))}
          </div>
          <div className="container-site flex items-center gap-4" aria-hidden="true">
            <span className="meta text-snow" dir="ltr">
              {pad(current)} / {pad(items.length)}
            </span>
            <span className="relative h-px flex-1 bg-snow/20">
              <span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-ochre rtl:origin-right" />
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
