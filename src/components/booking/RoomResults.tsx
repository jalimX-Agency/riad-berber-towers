"use client";

import { useMemo, useState } from "react";
import { CardCarousel } from "@/components/rooms/CardCarousel";
import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { RoomView } from "@/lib/rooms";
import { formatPrice } from "@/lib/rooms";
import { AmenityIcon } from "@/components/rooms/AmenityIcon";
import { cn } from "@/lib/utils";

export type Availability = {
  available: boolean;
  reason: "booked" | "blocked" | "capacity" | "min_nights" | null;
  minNights: number;
  total: number;
  perNight: number;
};
export type Stay = { checkIn: string; checkOut: string; nights: number; adults: number };

type Sort = "recommended" | "priceAsc" | "priceDesc";
const filterAmenities = ["balcony", "private_terrace"] as const;

export function RoomResults({
  rooms,
  availability,
  stay,
}: {
  rooms: RoomView[];
  availability: Record<string, Availability> | null;
  stay: Stay | null;
}) {
  const t = useTranslations("results");
  const tr = useTranslations("rooms");
  const ts = useTranslations("search");
  const locale = useLocale();

  const [floors, setFloors] = useState<number[]>([]);
  const [views, setViews] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<Sort>("recommended");
  const [panelOpen, setPanelOpen] = useState(false);

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const price = (r: RoomView) => availability?.[r.id]?.total ?? r.price;

  const shown = useMemo(() => {
    let list = rooms.filter(
      (r) =>
        (!floors.length || floors.includes(r.floor)) &&
        (!views.length || views.includes(r.view)) &&
        amenities.every((a) => r.amenities.includes(a)) &&
        (!onlyAvailable || !availability || availability[r.id]?.available),
    );
    if (sort === "priceAsc") list = [...list].sort((a, b) => price(a) - price(b));
    if (sort === "priceDesc") list = [...list].sort((a, b) => price(b) - price(a));
    // in "our order", available rooms come first once dates are chosen
    if (sort === "recommended" && availability)
      list = [...list].sort((a, b) => Number(!!availability[b.id]?.available) - Number(!!availability[a.id]?.available));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, floors, views, amenities, onlyAvailable, sort, availability]);

  const availableCount = availability ? rooms.filter((r) => availability[r.id]?.available).length : rooms.length;
  const anyFilter = floors.length || views.length || amenities.length || onlyAvailable;
  const count = (pred: (r: RoomView) => boolean) => rooms.filter(pred).length;

  const Check = ({ checked, onChange, label, n }: { checked: boolean; onChange: () => void; label: string; n?: number }) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm">
      <span className="flex items-center gap-2.5">
        <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[var(--earth)]" />
        {label}
      </span>
      {n !== undefined && <span className="meta text-muted">{n}</span>}
    </label>
  );

  const filters = (
    <div className="grid gap-5">
      <p className="font-medium">{availability ? t("available", { available: availableCount, total: rooms.length }) : t("allRooms", { total: rooms.length })}</p>
      {availability && <Check checked={onlyAvailable} onChange={() => setOnlyAvailable(!onlyAvailable)} label={t("onlyAvailable")} />}
      <fieldset className="grid">
        <legend className="label mb-1">{t("floor")}</legend>
        {[0, 1, 2].map((f) => (
          <Check key={f} checked={floors.includes(f)} onChange={() => toggle(floors, f, setFloors)} label={tr(`floor.${f}`)} n={count((r) => r.floor === f)} />
        ))}
      </fieldset>
      <fieldset className="grid">
        <legend className="label mb-1">{t("view")}</legend>
        {["mountain", "village", "garden"].map((v) => (
          <Check key={v} checked={views.includes(v)} onChange={() => toggle(views, v, setViews)} label={tr(`view.${v}`)} n={count((r) => r.view === v)} />
        ))}
      </fieldset>
      <fieldset className="grid">
        <legend className="label mb-1">{t("inRoom")}</legend>
        {filterAmenities.map((a) => (
          <Check key={a} checked={amenities.includes(a)} onChange={() => toggle(amenities, a, setAmenities)} label={tr(`amenities.${a}`)} n={count((r) => r.amenities.includes(a))} />
        ))}
      </fieldset>
      {anyFilter ? (
        <button
          type="button"
          onClick={() => {
            setFloors([]);
            setViews([]);
            setAmenities([]);
            setOnlyAvailable(false);
          }}
          className="w-fit text-sm text-earth underline underline-offset-4"
        >
          {t("clear")}
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      {/* Filters: sidebar on desktop, collapsible panel on mobile */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <button
          type="button"
          onClick={() => setPanelOpen(!panelOpen)}
          aria-expanded={panelOpen}
          aria-controls="room-filters"
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-rule bg-snow px-4 py-2 text-sm lg:hidden"
        >
          {panelOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
          {t("showFilters")}
        </button>
        <div id="room-filters" className={cn("rounded-[10px] border border-rule bg-snow p-4", !panelOpen && "hidden lg:block")}>
          {filters}
        </div>
      </aside>

      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {stay ? t("stayFor", { nights: ts("nights", { count: stay.nights }), adults: ts("adults", { count: stay.adults }) }) : ts("chooseDates")}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">{t("sort")}</span>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-rule bg-snow px-3 py-1.5">
              {(["recommended", "priceAsc", "priceDesc"] as Sort[]).map((s) => (
                <option key={s} value={s}>
                  {t(`sortOptions.${s}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {shown.length === 0 && <p className="rounded-[10px] border border-rule bg-snow p-6 text-center text-muted">{t("noResults")}</p>}

        <ul className="grid gap-4">
          {shown.map((room, i) => {
            const a = availability?.[room.id];
            const off = a && !a.available;
            const qs = stay ? `?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&adults=${stay.adults}` : "";
            const total = a ? formatPrice(a.total, room.currency, locale) : "";
            return (
              <li key={room.slug}>
                <article className={cn("grid overflow-hidden rounded-[10px] border border-rule bg-snow md:grid-cols-[240px_minmax(0,1fr)_220px]", off && "opacity-60")}>
                  <CardCarousel
                    images={room.cover ? [room.cover, ...room.images.filter((src) => src !== room.cover)] : room.images}
                    alt={room.name}
                    href={`/rooms/${room.slug}${qs}`}
                    sizes="(min-width: 768px) 240px, 100vw"
                    priority={i < 2}
                    className="aspect-[3/2] md:aspect-auto md:min-h-[200px]"
                  />

                  <div className="grid content-start gap-2 p-4 md:p-5">
                    <p className="label">
                      {tr(`category.${room.category}`)} · {tr(`floor.${room.floor}`)}
                    </p>
                    <h2 className="text-[1.65rem] leading-tight [html[dir=rtl]_&]:text-2xl">
                      <Link href={`/rooms/${room.slug}${qs}`} className="hover:text-earth">
                        {room.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted">
                      {tr(`view.${room.view}`)} · {tr("guests", { count: room.maxAdults })} · {tr("breakfast")}
                    </p>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {room.amenities.map((am) => (
                        <li key={am} className="inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs">
                          <AmenityIcon name={am} className="h-3.5 w-3.5 text-earth" />
                          {tr(`amenities.${am}`)}
                        </li>
                      ))}
                    </ul>
                    {off && a?.reason && (
                      <p className="mt-1 text-sm font-medium text-earth">{t(`reason.${a.reason}`, { max: room.maxAdults, count: a.minNights })}</p>
                    )}
                  </div>

                  <div className="grid content-between gap-4 border-t border-rule p-4 text-end md:border-s md:border-t-0 md:p-5">
                    {a ? (
                      <div className="grid gap-0.5">
                        <span className="text-xs text-muted">
                          {t("stayFor", { nights: ts("nights", { count: stay!.nights }), adults: ts("adults", { count: stay!.adults }) })}
                        </span>
                        <span className="font-display text-[2rem] font-semibold leading-none" dir="ltr">
                          {total}
                        </span>
                        <span className="text-xs text-muted">{t("perNightAvg", { price: formatPrice(a.perNight, room.currency, locale) })}</span>
                        <span className="text-xs text-granite">{tr("breakfast")}</span>
                      </div>
                    ) : (
                      <div className="grid gap-0.5">
                        <span className="text-xs text-muted">{tr("perNight")}</span>
                        <span className="font-display text-[2rem] font-semibold leading-none" dir="ltr">
                          {formatPrice(room.price, room.currency, locale)}
                        </span>
                        <span className="text-xs text-granite">{tr("breakfast")}</span>
                      </div>
                    )}

                    {a && a.available ? (
                      <Link href={`/book?room=${room.slug}&${qs.slice(1)}`} className="btn-primary justify-center">
                        {t("reserve")}
                      </Link>
                    ) : a ? (
                      <a href="#search" className="btn-outline justify-center">
                        {t("changeDates")}
                      </a>
                    ) : (
                      <Link href={`/rooms/${room.slug}`} className="btn-outline justify-center">
                        {t("seeRoom")}
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
