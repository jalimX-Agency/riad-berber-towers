"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Large photo + thumbnails; any photo opens a full-screen viewer (arrows, Esc, swipe-free keyboard nav). */
export function RoomGallery({ images, name }: { images: string[]; name: string }) {
  const t = useTranslations("rooms");
  const [open, setOpen] = useState<number | null>(null);
  const n = images.length;

  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);

  useEffect(() => {
    if (open === null) return;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      const rtl = document.documentElement.dir === "rtl";
      if (e.key === "ArrowRight") step(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") step(rtl ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, step]);

  if (!n) return null;
  const [first, ...rest] = images;

  return (
    <>
      <div className={cn("grid gap-3", rest.length && "md:grid-cols-[2fr_1fr]")}>
        <button type="button" onClick={() => setOpen(0)} className="group relative aspect-[3/2] overflow-hidden rounded-[4px] bg-walnut">
          <Image src={first} alt={name} fill priority sizes="(min-width: 768px) 66vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <span className="meta absolute bottom-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-snow backdrop-blur">
            <Expand className="h-3.5 w-3.5" aria-hidden="true" />
            {t("photos", { count: n })}
          </span>
        </button>
        {rest.length > 0 && (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-1 md:grid-rows-3">
            {rest.slice(0, 3).map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setOpen(i + 1)}
                className="group relative aspect-[3/2] overflow-hidden rounded-[4px] bg-walnut md:aspect-auto"
              >
                <Image src={src} alt={`${name} ${i + 2}`} fill sizes="(min-width: 768px) 22vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
              </button>
            ))}
          </div>
        )}
      </div>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-[60] flex flex-col bg-ink/95 text-snow">
          <div className="container-site flex h-16 items-center justify-between">
            <p className="meta">
              {open + 1} / {n}
            </p>
            <button type="button" onClick={() => setOpen(null)} className="grid h-11 w-11 place-items-center rounded-full border border-snow/25" autoFocus>
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={images[open]} alt={`${name} ${open + 1}`} fill sizes="100vw" className="object-contain" />
          </div>
          <div className="flex justify-center gap-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4" dir="ltr">
            <button type="button" onClick={() => step(-1)} className="grid h-12 w-12 place-items-center rounded-full border border-snow/25 hover:border-ochre">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Previous</span>
            </button>
            <button type="button" onClick={() => step(1)} className="grid h-12 w-12 place-items-center rounded-full border border-snow/25 hover:border-ochre">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Next</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
