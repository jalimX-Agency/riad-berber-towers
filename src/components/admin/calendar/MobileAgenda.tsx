"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilLine, X } from "lucide-react";
import type { CalBlock, CalBooking, CalendarData } from "@/lib/admin/control-calendar";
import { cn } from "@/lib/utils";
import type { Selection } from "./ActionDrawer";
import { ChannelMark, PLATFORM_COLORS, PlatformIcon, type Platform } from "./PlatformIcon";

type Filter = "all" | "airbnb" | "booking" | "expedia" | "direct";
const groupOf = (s: Platform): Filter => (s === "AIRBNB" ? "airbnb" : s === "BOOKING_COM" ? "booking" : s === "EXPEDIA" ? "expedia" : "direct");
const nf = new Intl.NumberFormat("fr-FR");
const statusTone: Record<string, string> = {
  PENDING: "bg-amber-300 text-amber-950",
  AWAITING_PAYMENT: "bg-orange-300 text-orange-950",
  PAYMENT_REVIEW: "bg-violet-400 text-white",
  CONFIRMED: "bg-emerald-600 text-white",
  CHECKED_IN: "bg-sky-600 text-white",
  CHECKED_OUT: "bg-stone-400 text-white",
};

/**
 * Phone view of the control calendar: one room at a time, one line per night (booking, prices, minimum stay).
 * Tap a night, then another to select a range, and "Modifier" opens the same drawer as on the desktop.
 */
export function MobileAgenda({
  data,
  canEdit,
  today,
  filter,
  pageUrl,
  onEdit,
  onBlock,
}: {
  data: CalendarData;
  canEdit: boolean;
  today: string;
  filter: Filter;
  pageUrl: string;
  onEdit: (s: Selection) => void;
  onBlock: (b: CalBlock) => void;
}) {
  const [roomId, setRoomId] = useState(data.rooms[0]?.id ?? "");
  const [sel, setSel] = useState<{ from: number; to: number } | null>(null);
  const room = data.rooms.find((r) => r.id === roomId) ?? data.rooms[0];
  if (!room) return null;
  const nights = data.nights[room.id] ?? [];
  const bookings = data.bookings.filter((b) => b.roomId === room.id && (filter === "all" || groupOf(b.platform) === filter));
  const blocks = filter === "all" || filter === "direct" ? data.blocks.filter((k) => k.roomId === room.id) : [];
  const covering = <T extends { s: string; e: string }>(items: T[], iso: string) => items.find((x) => x.s <= iso && x.e > iso);
  const bk = bookings.map((b) => ({ ...b, s: b.checkIn, e: b.checkOut }));
  const bl = blocks.map((k) => ({ ...k, s: k.start, e: k.end }));

  const tap = (d: number) => {
    if (!canEdit) return;
    setSel((cur) => (!cur || cur.from !== cur.to ? { from: d, to: d } : { from: Math.min(cur.from, d), to: Math.max(cur.from, d) }));
  };
  const count = sel ? sel.to - sel.from + 1 : 0;

  const chip = (b: CalBooking & { s: string }, iso: string) => {
    const first = b.s === iso || iso === data.days[0];
    const ota = b.platform === "AIRBNB" || b.platform === "BOOKING_COM" || b.platform === "EXPEDIA";
    return (
      <Link
        href={`${pageUrl}${pageUrl.includes("?") ? "&" : "?"}b=${encodeURIComponent(b.id)}`}
        scroll={false}
        prefetch={false}
        onClick={(e) => e.stopPropagation()}
        style={ota ? { backgroundColor: PLATFORM_COLORS[b.platform as "AIRBNB" | "BOOKING_COM" | "EXPEDIA"].bg, color: "#fff" } : undefined}
        className={cn("flex min-w-0 items-center gap-1.5 rounded-[8px] px-2 py-1.5 text-sm font-medium", !ota && (statusTone[b.status] ?? "bg-stone-300"), !first && "opacity-70")}
      >
        <PlatformIcon source={b.platform} className="h-4 w-4 rounded-[3px] ring-1 ring-white/60" />
        {/* two lines on the phone: the name keeps the full width */}
        <span className="grid min-w-0 leading-tight">
          <span className="truncate">{first ? b.guest : `↳ ${b.guest}`}</span>
          <span className="truncate text-xs font-normal opacity-85">
            {first ? `${b.nights} n. · ` : ""}départ {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${b.checkOut}T00:00:00Z`)).replace(".", "")}
          </span>
        </span>
      </Link>
    );
  };

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:hidden">
      {/* rooms */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {data.rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRoomId(r.id);
              setSel(null);
            }}
            aria-pressed={r.id === room.id}
            className={cn("shrink-0 rounded-full border px-4 py-2 text-sm", r.id === room.id ? "border-ink bg-ink text-snow" : "border-rule bg-snow")}
          >
            {r.short}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-rule overflow-hidden rounded-[14px] border border-rule bg-snow">
        {data.days.map((iso, d) => {
          const dt = new Date(`${iso}T00:00:00Z`);
          const wd = dt.getUTCDay();
          const night = nights[d];
          const b = covering(bk, iso);
          const k = !b ? covering(bl, iso) : undefined;
          const selected = sel && d >= sel.from && d <= sel.to;
          const min = Math.max(night?.minNights ?? 1, night?.channelMin ?? 1);
          return (
            <li key={iso}>
              <div
                role={canEdit ? "button" : undefined}
                tabIndex={canEdit ? 0 : undefined}
                onClick={() => tap(d)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && tap(d)}
                className={cn("grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5", (wd === 0 || wd === 6) && "bg-paper/50", selected && "bg-earth/15", iso < today && "opacity-50")}
              >
                <div className={cn("grid place-items-center rounded-[10px] py-1 text-center leading-tight", iso === today && "bg-earth text-snow")}>
                  <span className="text-[11px] uppercase opacity-70">{new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(dt).replace(".", "")}</span>
                  <span className="text-lg font-medium">{dt.getUTCDate()}</span>
                  {dt.getUTCDate() === 1 || d === 0 ? <span className="text-[10px] opacity-70">{new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" }).format(dt)}</span> : null}
                </div>

                <div className="min-w-0">
                  {b ? (
                    chip(b, iso)
                  ) : k ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBlock(k);
                      }}
                      className="w-full truncate rounded-[8px] bg-stone-200 px-2 py-1.5 text-start text-sm text-stone-800"
                      style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,.09) 0 6px, transparent 6px 12px)" }}
                    >
                      {k.kind === "maintenance" ? "Travaux" : k.reason || "Fermée"}
                    </button>
                  ) : (
                    <span className="text-sm text-emerald-800">Libre{min > 1 ? ` · min ${min} n.` : ""}</span>
                  )}
                </div>

                <div className="grid justify-items-end gap-0.5 text-xs tabular-nums">
                  <span className={cn("flex items-center gap-1", night?.siteCustom ? "font-semibold" : "text-muted")}>
                    {night ? nf.format(night.site) : "–"} € <ChannelMark channel="site" className="h-3.5 w-3.5" />
                  </span>
                  {room.beds24 && (
                    <>
                      <span className={cn("flex items-center gap-1", night?.booking == null && !data.beds24Error && "text-rose-700", data.beds24Error && "text-muted")}>
                        {data.beds24Error ? "–" : night?.booking == null ? "fermé" : `${nf.format(night.booking)} €`} <ChannelMark channel="booking" className="h-3.5 w-3.5" />
                      </span>
                      <span className={cn("flex items-center gap-1", night?.airbnb == null && !data.beds24Error && "text-rose-700", data.beds24Error && "text-muted")}>
                        {data.beds24Error ? "–" : night?.airbnb == null ? "fermé" : `${nf.format(night.airbnb)} €`} <ChannelMark channel="airbnb" className="h-3.5 w-3.5" />
                      </span>
                      <span className={cn("flex items-center gap-1", night?.expedia == null && !data.beds24Error && "text-rose-700", data.beds24Error && "text-muted")}>
                        {data.beds24Error ? "–" : night?.expedia == null ? "fermé" : `${nf.format(night.expedia)} €`} <ChannelMark channel="expedia" className="h-3.5 w-3.5" />
                      </span>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {canEdit && !sel && <p className="text-center text-xs text-muted">Touchez une nuit, puis une autre pour choisir plusieurs nuits.</p>}

      {sel && (
        <div className="sticky bottom-3 z-30 flex items-center gap-2 rounded-full border border-rule bg-snow p-2 shadow-xl">
          <button type="button" onClick={() => setSel(null)} className="grid h-10 w-10 place-items-center rounded-full border border-rule" aria-label="Annuler la sélection">
            <X className="h-4 w-4" />
          </button>
          <span className="flex-1 text-sm">
            {room.short} · {count} nuit{count > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={() => onEdit({ roomIds: [room.id], from: data.days[sel.from], to: data.days[sel.to] })}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-snow"
          >
            <PencilLine className="h-4 w-4" aria-hidden="true" />
            Modifier
          </button>
        </div>
      )}
    </div>
  );
}
