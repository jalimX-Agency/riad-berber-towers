"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createManualBooking, type NewBookingState } from "@/app/admin/(protected)/bookings/actions";
import { ARRIVAL_TIMES } from "@/lib/booking/arrival";
import { eur, sourceLabel } from "@/lib/admin/labels";

type Room = { slug: string; name: string; maxAdults: number };
type Quote = { available: boolean; reason: string | null; minNights: number; total: number };

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
  unavailable_booked: "La chambre est déjà réservée sur ces dates.",
  unavailable_blocked: "La chambre est fermée sur ces dates.",
  unavailable_: "Chambre indisponible.",
};
const reasonText: Record<string, string> = {
  booked: "Déjà réservée sur ces dates",
  blocked: "Fermée sur ces dates",
  capacity: "Plus de personnes que la capacité habituelle (autorisé pour l’équipe)",
  min_nights: "Sous le séjour minimum (autorisé pour l’équipe)",
};
const SOURCES = ["WHATSAPP", "PHONE", "EMAIL", "BOOKING_COM", "AIRBNB", "AGENCY", "WALK_IN"] as const;

export function NewBookingForm({ rooms, today }: { rooms: Room[]; today: string }) {
  const [state, action, pending] = useActionState<NewBookingState, FormData>(createManualBooking, {});
  const v = state.values ?? {};
  const [room, setRoom] = useState(v.room ?? rooms[0]?.slug ?? "");
  const [checkIn, setIn] = useState(v.checkIn ?? "");
  const [checkOut, setOut] = useState(v.checkOut ?? "");
  const [adults, setAdults] = useState(v.adults ?? "2");
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (!room || !checkIn || !checkOut || checkOut <= checkIn) return setQuote(null);
    const ctrl = new AbortController();
    fetch(`/api/availability?room=${room}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setQuote(d?.rooms?.[0] ?? null))
      .catch(() => {});
    return () => ctrl.abort();
  }, [room, checkIn, checkOut, adults]);

  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";
  const label = "grid gap-1 text-sm";
  const blocked = quote && (quote.reason === "booked" || quote.reason === "blocked");

  return (
    <form action={action} className="grid gap-6">
      {state.error && (
        <p role="alert" className="rounded-[10px] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          {errors[state.error] ?? "Une erreur est survenue."}
        </p>
      )}

      <section className="grid gap-4 rounded-[10px] border border-rule bg-snow p-5">
        <h2 className="text-xl">Séjour</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className={label}>
            Chambre
            <select name="room" value={room} onChange={(e) => setRoom(e.target.value)} className={field}>
              {rooms.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
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
            Adultes
            <select name="adults" value={adults} onChange={(e) => setAdults(e.target.value)} className={field}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {quote && (
          <div className={`rounded-[8px] p-3 text-sm ${blocked ? "bg-rose-50 text-rose-900" : quote.reason ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
            {quote.reason ? reasonText[quote.reason] : "Disponible."} Tarif calculé : <strong>{eur(quote.total)}</strong>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className={label}>
            Prix convenu (optionnel, €)
            <input type="number" name="total" min={0} step="1" defaultValue={v.total} placeholder={quote ? String(quote.total) : ""} className={field} />
          </label>
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

      <button type="submit" disabled={pending || !!blocked} className="btn-primary w-fit disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Créer la réservation
      </button>
    </form>
  );
}
