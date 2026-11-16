"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type Hour = { time: string; title: string; text: string; alt: string; photo: { src: string; w: number; h: number } };

const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * "One day at the house": on desktop the photo frame stays put while the hours scroll past;
 * the frame cross-fades to the hour in view, a big clock shows its time and a dot travels
 * along a dawn-to-night bar. On mobile every hour simply carries its own photo.
 */
export function StoryDay({ hours, label }: { hours: Hour[]; label: string }) {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" }, // the hour crossing the middle of the screen
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // dot position along the bar: 05:00 → 23:00
  const start = 5 * 60;
  const span = 18 * 60;
  const pos = (t: string) => Math.min(100, Math.max(0, ((minutes(t) - start) / span) * 100));

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
      {/* sticky frame (desktop) */}
      <div className="hidden lg:col-span-7 lg:block">
        <div className="sticky top-24 grid gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] bg-walnut">
            {hours.map((h, i) => (
              <Image
                key={h.time}
                src={h.photo.src}
                alt={i === active ? h.alt : ""}
                fill
                sizes="58vw"
                loading={i < 2 ? "eager" : "lazy"}
                className={cn("object-cover transition-opacity duration-700 ease-out motion-reduce:transition-none", i === active ? "opacity-100" : "opacity-0")}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/0 to-ink/0" />
            <p className="absolute bottom-4 start-5 font-mono text-[clamp(3rem,7vw,6.5rem)] leading-none tracking-tighter text-snow" dir="ltr" aria-live="polite">
              {hours[active].time}
            </p>
          </div>
          {/* dawn → night bar */}
          <div className="grid gap-2" aria-hidden="true" dir="ltr">
            <div className="relative h-[3px] rounded-full bg-gradient-to-r from-ochre/50 via-earth/60 to-ink">
              {hours.map((h, i) => (
                <span key={h.time} className={cn("absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full", i <= active ? "bg-ink" : "bg-rule")} style={{ left: `${pos(h.time)}%` }} />
              ))}
              <span
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-earth shadow transition-[left] duration-700 ease-out motion-reduce:transition-none"
                style={{ left: `${pos(hours[active].time)}%` }}
              />
            </div>
            <div className="meta flex justify-between text-granite">
              <span>05:00</span>
              <span>{label}</span>
              <span>23:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* the hours */}
      <ol className="grid lg:col-span-5">
        {hours.map((h, i) => (
          <li
            key={h.time}
            ref={(el) => {
              items.current[i] = el;
            }}
            data-i={i}
            className={cn("grid content-center gap-3 py-8 transition-opacity duration-500 lg:min-h-[78vh] lg:py-0", i === active ? "lg:opacity-100" : "lg:opacity-35")}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] lg:hidden">
              <Image src={h.photo.src} alt={h.alt} fill sizes="100vw" className="object-cover" />
              <span className="absolute bottom-3 start-4 font-mono text-5xl leading-none tracking-tighter text-snow drop-shadow" dir="ltr">{h.time}</span>
            </div>
            <span className="meta hidden text-earth lg:block" dir="ltr">{h.time}</span>
            <h3 className="text-3xl lg:text-4xl">{h.title}</h3>
            <p className="max-w-[42ch] text-[17px] leading-relaxed text-ink/80">{h.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
