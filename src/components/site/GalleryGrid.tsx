"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryPhoto = { src: string; w: number; h: number; alt: string; cat: string };
type Labels = { all: string; categories: Record<string, string>; close: string; prev: string; next: string; open: string };

/** Filterable photo grid (CSS columns) with a keyboard-friendly lightbox. */
export function GalleryGrid({ photos, labels }: { photos: GalleryPhoto[]; labels: Labels }) {
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);
  const shown = useMemo(() => (cat === "all" ? photos : photos.filter((p) => p.cat === cat)), [cat, photos]);
  const cats = useMemo(() => Object.keys(labels.categories).filter((k) => photos.some((p) => p.cat === k)), [labels.categories, photos]);

  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + shown.length) % shown.length)), [shown.length]);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open === null) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") step(document.dir === "rtl" ? -1 : 1);
      else if (e.key === "ArrowLeft") step(document.dir === "rtl" ? 1 : -1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener.current?.focus();
    };
  }, [open, step]);

  const current = open === null ? null : shown[open];

  return (
    <>
      <div role="toolbar" aria-label={labels.all} className="flex flex-wrap gap-2">
        {["all", ...cats].map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={cat === k}
            onClick={() => setCat(k)}
            className={cn("rounded-full border px-4 py-1.5 text-sm transition-colors", cat === k ? "border-ink bg-ink text-snow" : "border-rule hover:border-earth hover:text-earth")}
          >
            {k === "all" ? labels.all : labels.categories[k]}
          </button>
        ))}
      </div>

      <ul className="columns-2 gap-3 sm:gap-4 lg:columns-3 [&>li]:mb-3 sm:[&>li]:mb-4">
        {shown.map((p, i) => (
          <li key={p.src} className="break-inside-avoid">
            <button
              type="button"
              aria-label={`${labels.open}: ${p.alt}`}
              onClick={(e) => {
                opener.current = e.currentTarget;
                setOpen(i);
              }}
              className="group relative block w-full overflow-hidden rounded-card"
              style={{ aspectRatio: `${p.w} / ${p.h}` }}
            >
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            </button>
          </li>
        ))}
      </ul>

      {current &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={current.alt} className="fixed inset-0 z-[80] grid grid-rows-[auto_1fr_auto] bg-ink text-snow motion-safe:animate-[fade-in_.15s_ease-out]">
            <div className="flex items-center justify-between gap-4 p-4">
              <p className="meta text-snow/70" dir="ltr">{open! + 1} / {shown.length}</p>
              <button ref={closeBtn} type="button" onClick={() => setOpen(null)} aria-label={labels.close} className="grid h-11 w-11 place-items-center rounded-full border border-snow/30 hover:border-ochre hover:text-ochre">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="relative mx-4 sm:mx-16" onClick={() => setOpen(null)}>
              <Image key={current.src} src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <button type="button" onClick={() => step(-1)} aria-label={labels.prev} className="grid h-11 w-11 place-items-center rounded-full border border-snow/30 hover:border-ochre hover:text-ochre">
                <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
              </button>
              <p className="line-clamp-1 text-center text-sm text-snow/80">{current.alt}</p>
              <button type="button" onClick={() => step(1)} aria-label={labels.next} className="grid h-11 w-11 place-items-center rounded-full border border-snow/30 hover:border-ochre hover:text-ochre">
                <ChevronRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
