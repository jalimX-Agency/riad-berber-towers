import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw, TriangleAlert } from "lucide-react";
import { canManage, requireUser } from "@/lib/admin/guard";
import { getActiveRooms } from "@/lib/admin/rooms";
import { addDays, todayInImlil, toISO } from "@/lib/booking/dates";
import { beds24Configured } from "@/lib/beds24/client";
import { readCalendar, type DayCell } from "@/lib/beds24/calendar";
import { readSyncState } from "@/lib/beds24/pull";
import { BEDS24_ROOMS, CHANNELS } from "@/lib/beds24/rooms";
import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { applyChannelChanges, syncBeds24Now } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prix par canal" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const monthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1));
const WEEKDAYS = [
  { n: 1, label: "Lun" },
  { n: 2, label: "Mar" },
  { n: 3, label: "Mer" },
  { n: 4, label: "Jeu" },
  { n: 5, label: "Ven" },
  { n: 6, label: "Sam" },
  { n: 0, label: "Dim" },
];
const when = (iso?: string) => (iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(iso)) : "jamais");

const MESSAGES: Record<string, string> = {
  dates: "Dates invalides : la dernière nuit doit être après la première.",
  long: "Période trop longue : 400 nuits au maximum à la fois.",
  room: "Chambre inconnue.",
  value: "Valeur refusée : Booking 20 à 5 000 €, Airbnb 100 à 50 000 DH, séjour minimum 1 à 30 nuits.",
  empty: "Rien à envoyer : renseignez au moins un prix, un séjour minimum ou un changement de disponibilité.",
  none: "Aucune nuit ne correspond aux jours de la semaine choisis.",
};

export default async function ChannelRatesPage({ searchParams }: Props) {
  const user = await requireUser();
  const manager = canManage(user.role);
  const sp = await searchParams;
  const today = todayInImlil();

  const rooms = (await getActiveRooms()).filter((r) => r.slug in BEDS24_ROOMS);
  const room = rooms.find((r) => r.slug === sp.room) ?? rooms[0];
  const match = sp.month?.match(/^(\d{4})-(\d{2})$/);
  const start = match ? monthStart(Number(match[1]), Number(match[2]) - 1) : monthStart(today.getUTCFullYear(), today.getUTCMonth());
  const end = monthStart(start.getUTCFullYear(), start.getUTCMonth() + 1);
  const prev = monthStart(start.getUTCFullYear(), start.getUTCMonth() - 1);
  const key = (d: Date) => toISO(d).slice(0, 7);
  const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);
  const href = (r: string, m: Date) => `/admin/channel-rates?room=${r}&month=${key(m)}`;

  let cells: DayCell[] = [];
  let loadError = "";
  if (!beds24Configured()) loadError = "Beds24 n’est pas relié : la clé BEDS24_REFRESH_TOKEN manque sur ce serveur.";
  else if (room) {
    try {
      cells = await readCalendar(room.slug, start, addDays(end, -1));
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Beds24 ne répond pas.";
    }
  }
  const sync = await readSyncState().catch(() => null);

  const message =
    sp.done === "applied"
      ? `Envoyé à Beds24 : ${sp.nights} nuit(s) sur ${sp.rooms} chambre(s). Booking.com et Airbnb se mettent à jour en quelques secondes.`
      : sp.done === "synced"
        ? `Synchronisation terminée : ${sp.added} nouveau(x) séjour(s) ou fermeture(s), ${sp.removed} retiré(s), ${sp.pushed} élément(s) envoyé(s) à Beds24.`
        : sp.error === "beds24"
          ? `Beds24 a refusé le changement : ${sp.detail}`
          : sp.error === "sync"
            ? `Synchronisation impossible : ${sp.detail}`
            : sp.error
              ? (MESSAGES[sp.error] ?? "")
              : "";

  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";
  const label = "grid gap-1 text-sm";
  const offset = (start.getUTCDay() + 6) % 7; // Monday first
  const money = (n: number | null, symbol: string) => (n === null ? "–" : `${new Intl.NumberFormat("fr-FR").format(n)} ${symbol}`);

  return (
    <div className="grid max-w-6xl gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Beds24 · Booking.com et Airbnb</p>
          <h1 className="text-4xl">Prix et disponibilité par canal</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Un prix différent pour chaque plateforme, envoyé à Beds24 puis publié sur Booking.com (en €) et Airbnb (en DH). Les prix de réservation directe du site se règlent dans « Tarifs et fermetures ».
          </p>
        </div>
        <form action={syncBeds24Now} className="grid justify-items-end gap-1">
          <SubmitButton variant="outline">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Synchroniser maintenant
          </SubmitButton>
          <span className={cn("text-xs", sync && !sync.ok ? "text-rose-800" : "text-muted")}>
            Dernière lecture de Beds24 : {when(sync?.at)}
            {sync?.ok === false && ` · erreur : ${sync.error}`}
          </span>
        </form>
      </header>

      {message && (
        <p role="status" className={`rounded-[10px] border p-4 text-sm ${sp.error ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          {message}
        </p>
      )}

      {/* room tabs */}
      <nav className="flex flex-wrap gap-2" aria-label="Chambre">
        {rooms.map((r) => (
          <Link
            key={r.slug}
            href={href(r.slug, start)}
            aria-current={r.slug === room?.slug ? "page" : undefined}
            className={cn("rounded-full border px-4 py-1.5 text-sm transition-colors", r.slug === room?.slug ? "border-ink bg-ink text-snow" : "border-rule bg-snow hover:border-earth")}
          >
            {r.name.replace(/^Suite |^Room /, "")}
          </Link>
        ))}
      </nav>

      <section className="grid gap-4 rounded-[10px] border border-rule bg-snow p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl capitalize">
            {room?.name} · {monthName}
          </h2>
          <nav className="flex items-center gap-2" aria-label="Mois">
            <Link href={href(room?.slug ?? "", prev)} className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-snow hover:border-earth" aria-label="Mois précédent">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href={href(room?.slug ?? "", monthStart(today.getUTCFullYear(), today.getUTCMonth()))} className="rounded-full border border-rule bg-snow px-4 py-1.5 text-sm hover:border-earth">
              Aujourd’hui
            </Link>
            <Link href={href(room?.slug ?? "", end)} className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-snow hover:border-earth" aria-label="Mois suivant">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>

        {loadError ? (
          <p role="alert" className="flex items-center gap-2 rounded-[10px] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            {loadError}
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              {CHANNELS.map((c) => (
                <li key={c.key}>
                  <span className="font-medium text-ink">{c.label}</span> · prix en {c.currency}
                </li>
              ))}
              <li>
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-200 align-middle" /> fermé ou complet
              </li>
              <li>
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-200 align-middle" /> fermé sur une plateforme
              </li>
            </ul>
            <div className="overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-7 gap-1 text-xs">
                {WEEKDAYS.map((w) => (
                  <div key={w.n} className="px-2 py-1 text-center font-medium uppercase tracking-wide text-muted">
                    {w.label}
                  </div>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {cells.map((c) => {
                  const d = new Date(`${c.date}T00:00:00Z`);
                  const past = d < today;
                  const closed = c.blackout || c.avail <= 0;
                  const partial = !closed && (c.channelOff.booking || c.channelOff.airbnb);
                  return (
                    <div
                      key={c.date}
                      className={cn(
                        "grid min-h-[78px] content-between gap-0.5 rounded-[8px] border p-1.5",
                        closed ? "border-rose-200 bg-rose-50" : partial ? "border-amber-200 bg-amber-50" : "border-rule bg-paper/40",
                        past && "opacity-45",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{d.getUTCDate()}</span>
                        {closed ? (
                          <span className="text-[10px] uppercase text-rose-800">{c.blackout ? "fermé" : "complet"}</span>
                        ) : (
                          c.minStay && c.minStay > 1 && <span className="text-[10px] text-muted">min {c.minStay}</span>
                        )}
                      </div>
                      {CHANNELS.map((ch) => (
                        <div key={ch.key} className={cn("flex items-center justify-between gap-1", c.channelOff[ch.key] && "text-rose-800 line-through")} title={`${ch.label}${c.channelOff[ch.key] ? " : fermé" : ""}`}>
                          <span className="text-[10px] text-muted">{ch.key === "booking" ? "B" : "A"}</span>
                          <span className="tabular-nums">{money(c.prices[ch.key], ch.symbol)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>

      {manager ? (
        <section className="grid gap-4 rounded-[10px] border border-rule bg-snow p-5">
          <div>
            <h2 className="text-2xl">Modifier les prix et la disponibilité</h2>
            <p className="text-sm text-muted">
              Laissez un champ vide pour ne rien changer. Pour fermer une chambre sur <strong className="text-ink">toutes</strong> les plateformes, utilisez « Fermetures » dans Tarifs et fermetures. Ici vous
              pouvez fermer <strong className="text-ink">une seule</strong> plateforme (son prix est retiré pour ces nuits) ; pour la rouvrir, indiquez son prix.
            </p>
          </div>
          <form action={applyChannelChanges} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="month" value={key(start)} />
            <label className={label}>
              Chambre
              <select name="room" defaultValue={room?.slug ?? ""} className={field}>
                <option value="">Toutes les chambres</option>
                {rooms.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Première nuit
              <input name="from" type="date" required min={toISO(today)} defaultValue={toISO(start < today ? today : start)} className={field} />
            </label>
            <label className={label}>
              Dernière nuit
              <input name="to" type="date" required min={toISO(today)} defaultValue={toISO(addDays(end, -1))} className={field} />
            </label>
            <label className={label}>
              Séjour minimum (nuits)
              <input name="minStay" type="number" min={1} max={30} step={1} placeholder="inchangé" className={field} />
            </label>

            <label className={label}>
              Prix Booking.com (€ par nuit)
              <input name="priceBooking" type="number" min={20} max={5000} step="0.01" placeholder="inchangé" className={field} />
            </label>
            <label className={label}>
              Prix Airbnb (DH par nuit)
              <input name="priceAirbnb" type="number" min={100} max={50000} step={1} placeholder="inchangé" className={field} />
            </label>
            <label className={label}>
              Booking.com
              <select name="stateBooking" defaultValue="keep" className={field}>
                <option value="keep">Disponibilité inchangée</option>
                <option value="close">Fermer sur Booking.com</option>
                <option value="open">Rouvrir sur Booking.com</option>
              </select>
            </label>
            <label className={label}>
              Airbnb
              <select name="stateAirbnb" defaultValue="keep" className={field}>
                <option value="keep">Disponibilité inchangée</option>
                <option value="close">Fermer sur Airbnb</option>
                <option value="open">Rouvrir sur Airbnb</option>
              </select>
            </label>

            <fieldset className="grid gap-2 sm:col-span-2 lg:col-span-4">
              <legend className="text-sm">Jours de la semaine concernés</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((w) => (
                  <label key={w.n} className="flex cursor-pointer items-center gap-2 rounded-full border border-rule bg-snow px-3 py-1.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-snow">
                    <input type="checkbox" name="wd" value={w.n} defaultChecked className="sr-only" />
                    {w.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <SubmitButton className="w-fit sm:col-span-2 lg:col-span-4" confirm="Envoyer ce changement à Booking.com et Airbnb ? Il s’applique aux plateformes en quelques secondes." confirmLabel="Envoyer">
              Envoyer à Beds24
            </SubmitButton>
          </form>
        </section>
      ) : (
        <p className="text-sm text-muted">La modification des prix par canal est réservée au propriétaire et aux administrateurs.</p>
      )}
    </div>
  );
}
