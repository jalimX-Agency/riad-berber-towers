"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createManualBooking, type NewBookingState } from "@/app/admin/(protected)/bookings/actions";
import { ARRIVAL_TIMES } from "@/lib/booking/arrival";
import { eur, sourceLabel } from "@/lib/admin/labels";

type Room = { slug: string; name: string; maxAdults: number };
type Quote = { slug: string; available: boolean; reason: string | null; minNights: number; total: number };

const errors: Record<string, string> = {
  dates_missing: "Choisissez les dates d’arrivée et de départ.",
  dates_invalid: "Dates invalides.",
  dates_past: "La date d’arrivée est passée.",
  dates_order: "Le départ doit être après l’arrivée.",
  dates_too_long: "Séjour limité à 30 nuits.",
  guest_firstName: "Prénom manquant.",
  guest_lastName: "Nom manquant.",
  guest_email: "Email invalide.",
  guest_phone: "Téléphone invalide.",
  total: "Prix invalide.",
  rooms_missing: "Choisissez au moins une chambre.",
  unavailable_booked: "Une chambre est déjà réservée sur ces dates.",
  unavailable_blocked: "Une chambre est fermée sur ces dates.",
  unavailable_: "Chambre indisponible.",
};
const reasonText: Record<string, string> = {
  booked: "Déjà réservée sur ces dates",
  blocked: "Fermée sur ces dates",
  capacity: "Plus de personnes que la capacité habituelle (autorisé pour l’équipe)",
  min_nights: "Sous le séjour minimum (autorisé pour l’équipe)",
};
// Booking.com and Airbnb reservations arrive by themselves through Beds24: entering them here would sell the nights twice
const SOURCES = ["WHATSAPP", "PHONE", "EMAIL", "AGENCY", "WALK_IN"] as const;

const isBlocked = (q?: Quote) => Boolean(q && (q.reason === "booked" || q.reason === "blocked"));

export function NewBookingForm({ rooms, today, initial }: { rooms: Room[]; today: string; initial?: { room?: string; checkIn?: string; checkOut?: string } }) {
  const [state, action, pending] = useActionState<NewBookingState, FormData>(createManualBooking, {});
  const v = state.values ?? {};
  const order = rooms.map((r) => r.slug);
  const [selected, setSelected] = useState<string[]>(() => {
    const start = v.rooms ? v.rooms.split(",") : [initial?.room ?? rooms[0]?.slug ?? ""];
    return order.filter((s) => start.includes(s));
  });
  const [checkIn, setIn] = useState(v.checkIn ?? initial?.checkIn ?? "");
  const [checkOut, setOut] = useState(v.checkOut ?? initial?.checkOut ?? "");
  const [adults, setAdults] = useState(v.adults ?? "2");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  // one call prices every room for these dates
  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return setQuotes({});
    const ctrl = new AbortController();
    fetch(`/api/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setQuotes(Object.fromEntries(((d?.rooms ?? []) as Quote[]).map((q) => [q.slug, q]))))
      .catch(() => {});
    return () => ctrl.abort();
  }, [checkIn, checkOut, adults]);

  const toggle = (slug: string) => setSelected((cur) => order.filter((x) => (x === slug ? !cur.includes(slug) : cur.includes(x))));
  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";
  const label = "grid gap-1 text-sm";
  const blocked = selected.some((slug) => isBlocked(quotes[slug]));
  const multi = selected.length > 1;
  const sum = selected.reduce((t, slug) => t + (quotes[slug]?.total ?? 0), 0);

  return (
    <form action={action} className="grid gap-6">
      {state.error && (
        <p role="alert" className="rounded-[10px] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          {errors[state.error] ?? "Une erreur est survenue."}
          {state.detail ? ` (${state.detail})` : ""}
        </p>
      )}

      <section className="grid gap-4 rounded-[10px] border border-rule bg-snow p-5">
        <h2 className="text-xl">Séjour</h2>

        <div className="grid gap-2">
          <span className="text-sm">Chambres : une ou plusieurs, pour les mêmes dates</span>
          <input type="hidden" name="rooms" value={selected.join(",")} />
          <div className="flex flex-wrap gap-2">
            {rooms.map((r) => {
              const on = selected.includes(r.slug);
              const q = quotes[r.slug];
              return (
                <button
                  key={r.slug}
                  type="button"
                  onClick={() => toggle(r.slug)}
                  aria-pressed={on}
                  title={isBlocked(q) ? reasonText[q!.reason!] : undefined}
                  className={`rounded-full border px-4 py-2 text-sm ${on ? "border-ink bg-ink text-snow" : "border-rule bg-snow"} ${isBlocked(q) ? "line-through opacity-60" : ""}`}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className={label}>
            Arrivée
            <input
              type="date"
              name="checkIn"
              required
              min={today}
              value={checkIn}
              onChange={(e) => {
                setIn(e.target.value);
                if (!checkOut || checkOut <= e.target.value) {
                  const d = new Date(`${e.target.value}T00:00:00Z`);
                  d.setUTCDate(d.getUTCDate() + 1);
                  setOut(d.toISOString().slice(0, 10));
                }
              }}
              className={field}
            />
          </label>
          <label className={label}>
            Départ
            <input type="date" name="checkOut" required min={checkIn || today} value={checkOut} onChange={(e) => setOut(e.target.value)} className={field} />
          </label>
          <label className={label}>
            {multi ? "Adultes par chambre" : "Adultes"}
            <select name="adults" value={adults} onChange={(e) => setAdults(e.target.value)} className={field}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selected.length > 0 && Object.keys(quotes).length > 0 && (
          <ul className="grid gap-2">
            {selected.map((slug) => {
              const q = quotes[slug];
              if (!q) return null;
              return (
                <li key={slug} className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[8px] p-3 text-sm ${isBlocked(q) ? "bg-rose-50 text-rose-900" : q.reason ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
                  <span className="min-w-[8rem] font-medium">{rooms.find((r) => r.slug === slug)?.name ?? slug}</span>
                  <span className="flex-1">
                    {q.reason ? reasonText[q.reason] : "Disponible."} Tarif calculé : <strong>{eur(q.total)}</strong>
                  </span>
                  {multi && (
                    <label className="flex items-center gap-2 text-xs text-ink">
                      Prix convenu €
                      <input type="number" name={`total_${slug}`} min={0} step="1" defaultValue={v[`total_${slug}`]} placeholder={String(q.total)} className="w-24 rounded-[8px] border border-rule bg-snow px-2 py-1 text-sm" />
                    </label>
                  )}
                </li>
              );
            })}
            {multi && (
              <li className="px-3 text-sm">
                {selected.length} chambres · total calculé <strong>{eur(sum)}</strong>
              </li>
            )}
          </ul>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {!multi && (
            <label className={label}>
              Prix convenu (optionnel, €)
              <input type="number" name="total" min={0} step="1" defaultValue={v.total} placeholder={selected[0] && quotes[selected[0]] ? String(quotes[selected[0]].total) : ""} className={field} />
            </label>
          )}
          <label className={label}>
            Origine
            <select name="source" defaultValue={v.source ?? "WHATSAPP"} className={field}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {sourceLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Statut
            <select name="status" defaultValue={v.status ?? "CONFIRMED"} className={field}>
              <option value="CONFIRMED">Confirmée</option>
              <option value="PENDING">En attente</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 rounded-[10px] border border-rule bg-snow p-5">
        <h2 className="text-xl">Client</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Prénom *
            <input name="firstName" required maxLength={80} defaultValue={v.firstName} className={field} />
          </label>
          <label className={label}>
            Nom *
            <input name="lastName" required maxLength={80} defaultValue={v.lastName} className={field} />
          </label>
          <label className={label}>
            Téléphone / WhatsApp
            <input name="phone" type="tel" maxLength={30} dir="ltr" defaultValue={v.phone} placeholder="+33 6 12 34 56 78" className={field} />
          </label>
          <label className={label}>
            Email
            <input name="email" type="email" maxLength={160} dir="ltr" defaultValue={v.email} className={field} />
          </label>
          <label className={label}>
            Pays
            <input name="country" maxLength={60} defaultValue={v.country} className={field} />
          </label>
          <label className={label}>
            Langue du client (pour les emails)
            <select name="locale" defaultValue={v.locale ?? "fr"} className={field}>
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="es">Espagnol</option>
              <option value="de">Allemand</option>
              <option value="ar">Arabe</option>
            </select>
          </label>
          <label className={label}>
            Lits
            <select name="bedSetup" defaultValue={v.bedSetup ?? "DOUBLE"} className={field}>
              <option value="DOUBLE">Un grand lit (king size)</option>
              <option value="TWIN">Deux lits séparés</option>
            </select>
          </label>
          <label className={label}>
            Heure d’arrivée
            <select name="arrivalTime" defaultValue={v.arrivalTime ?? "unknown"} className={field}>
              {ARRIVAL_TIMES.map((a) => (
                <option key={a} value={a}>
                  {a === "unknown" ? "Inconnue" : a === "22+" ? "Après 22 h" : a.replace("-", " h – ") + " h"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={label}>
          Demandes du client
          <textarea name="specialRequests" rows={3} maxLength={1000} defaultValue={v.specialRequests} className={field} />
        </label>
        <label className={label}>
          Notes internes
          <textarea name="internalNotes" rows={3} maxLength={4000} defaultValue={v.internalNotes} className={field} />
        </label>
      </section>

      <button type="submit" disabled={pending || blocked || selected.length === 0} className="btn-primary w-fit disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {multi ? `Créer la réservation (${selected.length} chambres)` : "Créer la réservation"}
      </button>
    </form>
  );
}
