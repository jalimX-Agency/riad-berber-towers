"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Photo } from "@/lib/home-media";
import { useScrollProgress } from "@/lib/use-scroll-progress";
import { cn } from "@/lib/utils";

export type ClimbRoom = { slug: string; name: string; view: string; price: string; cover: string };
export type ClimbStage = {
  id: string;
  num: string;
  label: string;
  title: string;
  text: string;
  photo: Photo;
  rooms: ClimbRoom[];
};

type Props = { stages: ClimbStage[]; fromLabel: string; perNight: string };

function RoomRow({ room, fromLabel, perNight, dark }: { room: ClimbRoom; fromLabel: string; perNight: string; dark?: boolean }) {
  return (
    <li>
      <Link
        href={`/rooms/${room.slug}`}
        className={cn(
          "group flex items-center gap-3 rounded-[10px] border p-2 pe-3 transition-colors",
          dark ? "border-snow/20 bg-ink/35 text-snow backdrop-blur-md hover:bg-ink/55" : "border-rule bg-snow hover:border-earth",
        )}
      >
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[6px]">
          <Image src={room.cover} alt="" fill sizes="64px" className="object-cover" />
        </span>
        <span className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate font-display text-xl [html[dir=rtl]_&]:font-arabic-display [html[dir=rtl]_&]:text-lg">{room.name}</span>
          <span className={cn("text-xs", dark ? "text-snow/70" : "text-muted")}>{room.view}</span>
        </span>
        <span className="shrink-0 text-end leading-tight">
          <span className={cn("block text-[10px] uppercase tracking-[0.14em]", dark ? "text-snow/60" : "text-granite")}>{fromLabel}</span>
          <span className="meta text-sm">{room.price}</span>
          <span className={cn("block text-[10px]", dark ? "text-snow/60" : "text-muted")}>{perNight}</span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
    </li>
  );
}

/**
 * Signature 1, "the climb": on large screens the section pins while the page scrolls,
 * and the house is climbed floor by floor (ground → first → second → roof).
 * Phones and reduced-motion users get the same content as a plain stacked list.
 */
export function HouseClimb({ stages, fromLabel, perNight }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useScrollProgress(ref, (v) => setActive(Math.min(stages.length - 1, Math.floor(v * stages.length))));
  const stage = stages[active];

  return (
    <>
      {/* stacked: phones, tablets, reduced motion */}
      <ol className="climb-stack container-site grid gap-14 pb-4">
        {stages.map((s) => (
          <li key={s.id} className="grid gap-4">
            <div className="flex items-baseline gap-3 border-t border-rule pt-4">
              <span className="font-mono text-4xl leading-none text-earth">{s.num}</span>
              <span className="label">{s.label}</span>
            </div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-card md:aspect-[16/9]">
              <Image src={s.photo.src} alt="" fill sizes="(min-width: 768px) 90vw, 100vw" className="object-cover" />
            </div>
            <div className="grid gap-2">
              <h3 className="text-3xl">{s.title}</h3>
              <p className="max-w-prose text-muted">{s.text}</p>
            </div>
            {s.rooms.length > 0 && (
              <ul className="grid gap-2 md:grid-cols-2">
                {s.rooms.map((r) => (
                  <RoomRow key={r.slug} room={r} fromLabel={fromLabel} perNight={perNight} />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      {/* pinned: large screens with motion allowed */}
      <div ref={ref} className="climb-pin relative" style={{ height: `${stages.length * 100}svh` }}>
        <div className="sticky top-0 h-svh overflow-hidden bg-ink">
          {stages.map((s, i) => (
            <Image
              key={s.id}
              src={s.photo.src}
              alt=""
              fill
              sizes="100vw"
              className={cn(
                "object-cover transition-[opacity,transform] duration-[900ms] ease-out",
                i === active ? "scale-100 opacity-100" : "scale-[1.06] opacity-0",
              )}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 via-45% to-ink/10 rtl:bg-gradient-to-l" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/70 to-transparent" />

          <div className="container-site relative grid h-full grid-cols-[auto_minmax(0,1fr)] items-end gap-12 pb-12 pt-[128px] text-snow">
            {/* floor rail: the counter climbs as you scroll */}
            <ol className="flex h-full flex-col-reverse justify-between border-s border-snow/25 py-2" aria-hidden="true">
              {stages.map((s, i) => (
                <li key={s.id} className={cn("-ms-px flex items-center gap-3 border-s-2 ps-4 transition-colors duration-500", i === active ? "border-ochre text-snow" : "border-transparent text-snow/55")}>
                  <span className="meta">{s.num}</span>
                  <span className="text-xs uppercase tracking-[0.18em] [html[dir=rtl]_&]:tracking-normal">{s.label}</span>
                </li>
              ))}
            </ol>

            <div className="grid max-w-2xl gap-6" aria-live="polite">
              <span key={`n-${stage.id}`} className="climb-in font-mono text-[clamp(5rem,11vw,9rem)] leading-[0.8] text-ochre">
                {stage.num}
              </span>
              <div key={`t-${stage.id}`} className="climb-in grid gap-3">
                <p className="label text-snow/70">{stage.label}</p>
                <h3 className="text-5xl xl:text-6xl">{stage.title}</h3>
                <p className="max-w-lg text-snow/80">{stage.text}</p>
              </div>
              {stage.rooms.length > 0 && (
                <ul key={`r-${stage.id}`} className="climb-in grid gap-2 xl:grid-cols-2">
                  {stage.rooms.map((r) => (
                    <RoomRow key={r.slug} room={r} fromLabel={fromLabel} perNight={perNight} dark />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
