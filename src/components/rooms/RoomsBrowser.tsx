"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { RoomView } from "@/lib/rooms";
import { formatPrice } from "@/lib/rooms";
import { AmenityIcon } from "./AmenityIcon";
import { cn } from "@/lib/utils";

type Filter = "all" | 0 | 1 | 2;

/** Floor filter + editorial list of rooms (one row per room, image side alternates). */
export function RoomsBrowser({ rooms }: { rooms: RoomView[] }) {
  const t = useTranslations("rooms");
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const floors = [...new Set(rooms.map((r) => r.floor))].sort() as (0 | 1 | 2)[];
  const shown = filter === "all" ? rooms : rooms.filter((r) => r.floor === filter);

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-rule py-4">
        <div role="group" aria-label={t("filter")} className="flex flex-wrap gap-2">
          {(["all", ...floors] as Filter[]).map((f) => (
            <button
              key={String(f)}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                filter === f ? "border-ink bg-ink text-snow" : "border-rule text-ink hover:border-earth hover:text-earth",
              )}
            >
              {f === "all" ? t("all") : t(`floor.${f}`)}
              <span className="meta ms-2 opacity-60">
                {f === "all" ? rooms.length : rooms.filter((r) => r.floor === f).length}
              </span>
            </button>
          ))}
        </div>
        <p className="meta text-muted" aria-live="polite">
          {t("showing", { count: shown.length })}
        </p>
      </div>

      <ol className="grid gap-16 md:gap-24">
        {shown.map((room, i) => (
          <li key={room.slug}>
            <article className="group grid items-center gap-6 md:grid-cols-12 md:gap-10">
              <Link
                href={`/rooms/${room.slug}`}
                className={cn(
                  "reveal-clip relative block aspect-[3/2] overflow-hidden rounded-[4px] bg-walnut md:col-span-7",
                  i % 2 === 1 && "md:order-2",
                )}
                aria-label={room.name}
              >
                {room.cover && (
                  <Image
                    src={room.cover}
                    alt={room.name}
                    fill
                    sizes="(min-width: 768px) 58vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    priority={i === 0}
                  />
                )}
                <span className="meta absolute start-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-snow backdrop-blur">
                  {t("photos", { count: room.images.length })}
                </span>
              </Link>

              <div className={cn("grid gap-4 md:col-span-5", i % 2 === 1 && "md:order-1")}>
                <p className="meta text-granite">
                  {String(room.order).padStart(2, "0")} · {t(`category.${room.category}`)} · {t(`floor.${room.floor}`)}
                </p>
                <h2 className="text-4xl md:text-5xl">
                  <Link href={`/rooms/${room.slug}`} className="hover:text-earth">
                    {room.name}
                  </Link>
                </h2>
                <p className="font-display text-xl italic text-muted [html[dir=rtl]_&]:font-[family-name:var(--font-arabic)] [html[dir=rtl]_&]:not-italic">
                  {room.tagline}
                </p>
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                  <li>{t(`view.${room.view}`)}</li>
                  <li>{t("guests", { count: room.maxAdults })}</li>
                  {room.amenities.slice(0, 2).map((a) => (
                    <li key={a} className="inline-flex items-center gap-1.5">
                      <AmenityIcon name={a} className="h-4 w-4 text-earth" />
                      {t(`amenities.${a}`)}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-t border-rule pt-4">
                  <p>
                    <span className="font-display text-4xl font-semibold" dir="ltr">
                      {formatPrice(room.price, room.currency, locale)}
                    </span>
                    <span className="ms-2 text-sm text-muted">{t("perNight")}</span>
                    <span className="block text-xs text-granite">{t("breakfast")}</span>
                  </p>
                  <Link href={`/rooms/${room.slug}`} className="btn-outline">
                    {t("details")}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
