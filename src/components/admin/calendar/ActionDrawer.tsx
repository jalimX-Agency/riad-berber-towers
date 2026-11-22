"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import { applyChanges } from "@/app/admin/(protected)/calendar/actions";
import type { CalNight, CalRoom } from "@/lib/admin/control-calendar";
import { cn } from "@/lib/utils";
import { toast } from "@/components/admin/Toaster";
import { ChannelMark } from "./PlatformIcon";

export type Selection = { roomIds: string[]; from: string; to: string };

const WEEKDAYS = [
  { n: 1, label: "L" },
  { n: 2, label: "M" },
  { n: 3, label: "M" },
  { n: 4, label: "J" },
  { n: 5, label: "V" },
  { n: 6, label: "S" },
  { n: 0, label: "D" },
];
const nextDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const fmt = (n: number | null | undefined) => (n == null ? "" : String(n));

type Avail = "keep" | "open" | "close";

/** Side panel (bottom sheet on phones) to change prices, minimum stay and availability for the selected nights. */
export function ActionDrawer({
  selection,
  rooms,
  nights,
  today,
  onClose,
  onDone,
}: {
  selection: Selection;
  rooms: CalRoom[];
  nights: Record<string, CalNight[]>;
  today: string;
  onClose: () => void;
  onDone: (message: string, ok: boolean) => void;
}) {
  const [roomIds, setRoomIds] = useState<string[]>(selection.roomIds);
  const [from, setFrom] = useState(selection.from < today ? today : selection.from);
  const [to, setTo] = useState(selection.to < today ? today : selection.to);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [site, setSite] = useState("");
  const [booking, setBooking] = useState("");
  const [airbnb, setAirbnb] = useState("");
  const [expedia, setExpedia] = useState("");
  const [minStay, setMinStay] = useState("");
  const [all, setAll] = useState<Avail>("keep");
  const [bookingState, setBookingState] = useState<Avail>("keep");
  const [airbnbState, setAirbnbState] = useState<Avail>("keep");
  const [expediaState, setExpediaState] = useState<Avail>("keep");
  const [note, setNote] = useState("");
  // a refused change shows as a toast
  const setError = (text: string) => {
    if (text) toast("error", text);
  };
  const [pending, start] = useTransition();

  // current values, shown as placeholders when one room and one night are selected
  const current = useMemo(() => {
    if (roomIds.length !== 1 || from !== to) return null;
    return nights[roomIds[0]]?.find((n) => n.date === from) ?? null;
  }, [roomIds, from, to, nights]);

  const toggleRoom = (id: string) => setRoomIds((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  const toggleDay = (n: number) => setWeekdays((w) => (w.includes(n) ? w.filter((x) => x !== n) : [...w, n]));
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!roomIds.length) return setError("Choisissez au moins une chambre.");
    start(async () => {
      const r = await applyChanges({
        rooms: roomIds,
        from,
        to,
        weekdays,
        site: num(site),
        booking: num(booking),
        airbnb: num(airbnb),
        expedia: num(expedia),
        minStay: num(minStay),
        all,
        bookingState,
        airbnbState,
        expediaState,
        note,
      });
      if (r.ok) onDone(r.message, true);
      else setError(r.error);
    });
  }

  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm tabular-nums";
  const label = "grid gap-1 text-sm";
  const single = roomIds.length === 1 ? rooms.find((r) => r.id === roomIds[0]) : null;

  return (
    <>
      <button type="button" aria-label="Fermer" onClick={onClose} className="fixed inset-0 z-40 bg-ink/30 lg:bg-transparent" />
      <aside
        role="dialog"
        aria-label="Modifier les nuits sélectionnées"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[18px] border border-rule bg-snow p-5 shadow-2xl lg:inset-y-0 lg:end-0 lg:start-auto lg:max-h-none lg:w-[420px] lg:rounded-none lg:border-y-0 lg:border-e-0"
      >
        <form onSubmit={submit} className="grid gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label">Nuits sélectionnées</p>
              <h2 className="text-2xl">Modifier</h2>
            </div>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-rule hover:border-earth" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm">Chambres</legend>
            <div className="flex flex-wrap gap-1.5">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRoom(r.id)}
                  aria-pressed={roomIds.includes(r.id)}
                  className={cn("rounded-full border px-3 py-1 text-sm", roomIds.includes(r.id) ? "border-ink bg-ink text-snow" : "border-rule bg-snow hover:border-earth")}
                >
                  {r.short}
                </button>
              ))}
              <button type="button" onClick={() => setRoomIds(roomIds.length === rooms.length ? [] : rooms.map((r) => r.id))} className="rounded-full px-3 py-1 text-sm text-earth underline-offset-2 hover:underline">
                {roomIds.length === rooms.length ? "Aucune" : "Toutes"}
              </button>
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              Première nuit
              <input type="date" required min={today} value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
            </label>
            <label className={label}>
              Dernière nuit
              <input type="date" required min={from} value={to} onChange={(e) => setTo(e.target.value)} className={field} />
            </label>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm">Jours concernés {weekdays.length ? "" : <span className="text-muted">(tous)</span>}</legend>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((w) => (
                <button
                  key={w.n}
                  type="button"
                  onClick={() => toggleDay(w.n)}
                  aria-pressed={weekdays.includes(w.n)}
                  className={cn("grid h-8 w-8 place-items-center rounded-full border text-xs", weekdays.includes(w.n) ? "border-ink bg-ink text-snow" : "border-rule hover:border-earth")}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-3 rounded-[12px] border border-rule p-4">
            <legend className="px-1 text-sm font-medium">Prix par nuit</legend>
            <label className={label}>
              <span className="flex items-center gap-2">
                <ChannelMark channel="site" /> Site (réservation directe) · €
              </span>
              <input inputMode="decimal" value={site} onChange={(e) => setSite(e.target.value)} placeholder={current ? fmt(current.site) : "inchangé"} className={field} />
            </label>
            <label className={label}>
              <span className="flex items-center gap-2">
                <ChannelMark channel="booking" /> Booking.com · €
              </span>
              <input inputMode="decimal" value={booking} onChange={(e) => setBooking(e.target.value)} placeholder={current ? fmt(current.booking) || "fermé" : "inchangé"} className={field} />
            </label>
            <label className={label}>
              <span className="flex items-center gap-2">
                <ChannelMark channel="airbnb" /> Airbnb · €
              </span>
              <input inputMode="numeric" value={airbnb} onChange={(e) => setAirbnb(e.target.value)} placeholder={current ? fmt(current.airbnb) || "fermé" : "inchangé"} className={field} />
            </label>
            <label className={label}>
              <span className="flex items-center gap-2">
                <ChannelMark channel="expedia" /> Expedia · €
              </span>
              <input inputMode="decimal" value={expedia} onChange={(e) => setExpedia(e.target.value)} placeholder={current ? fmt(current.expedia) || "fermé" : "inchangé"} className={field} />
            </label>
            <label className={label}>
              Séjour minimum (toutes plateformes)
              <input inputMode="numeric" value={minStay} onChange={(e) => setMinStay(e.target.value)} placeholder={current ? String(Math.max(current.minNights, current.channelMin ?? 1)) : "inchangé"} className={field} />
            </label>
          </fieldset>

          <fieldset className="grid gap-3 rounded-[12px] border border-rule p-4">
            <legend className="px-1 text-sm font-medium">Disponibilité</legend>
            <label className={label}>
              Toutes les plateformes
              <select value={all} onChange={(e) => setAll(e.target.value as Avail)} className={field}>
                <option value="keep">Inchangée</option>
                <option value="close">Fermer la chambre partout</option>
                <option value="open">Rouvrir partout</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                <span className="flex items-center gap-2">
                  <ChannelMark channel="booking" /> Booking.com
                </span>
                <select value={bookingState} onChange={(e) => setBookingState(e.target.value as Avail)} className={field}>
                  <option value="keep">Inchangée</option>
                  <option value="close">Fermer</option>
                  <option value="open">Rouvrir</option>
                </select>
              </label>
              <label className={label}>
                <span className="flex items-center gap-2">
                  <ChannelMark channel="airbnb" /> Airbnb
                </span>
                <select value={airbnbState} onChange={(e) => setAirbnbState(e.target.value as Avail)} className={field}>
                  <option value="keep">Inchangée</option>
                  <option value="close">Fermer</option>
                  <option value="open">Rouvrir</option>
                </select>
              </label>
              <label className={label}>
                <span className="flex items-center gap-2">
                  <ChannelMark channel="expedia" /> Expedia
                </span>
                <select value={expediaState} onChange={(e) => setExpediaState(e.target.value as Avail)} className={field}>
                  <option value="keep">Inchangée</option>
                  <option value="close">Fermer</option>
                  <option value="open">Rouvrir</option>
                </select>
              </label>
            </div>
            {(bookingState === "open" || airbnbState === "open" || expediaState === "open") && <p className="text-xs text-muted">Pour rouvrir une plateforme, indiquez aussi son prix ci-dessus.</p>}
            {all === "close" && (
              <label className={label}>
                Motif (optionnel)
                <input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="ex. travaux, famille" className={field} />
              </label>
            )}
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-medium text-snow hover:bg-earth disabled:opacity-60">
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Appliquer
            </button>
            {single && (
              <Link href={`/admin/bookings/new?room=${single.slug}&checkIn=${from}&checkOut=${nextDay(to)}`} className="inline-flex items-center gap-1.5 rounded-full border border-ink px-4 py-2 text-sm hover:border-earth hover:text-earth">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nouvelle réservation
              </Link>
            )}
          </div>
          <p className="text-xs text-muted">Booking.com et Airbnb reçoivent le changement via Beds24 en quelques secondes. Le site l’applique immédiatement.</p>
        </form>
      </aside>
    </>
  );
}
