import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getActiveRooms } from "@/lib/admin/rooms";
import { canManage, requireUser } from "@/lib/admin/guard";
import { addDays, parseDay, todayInImlil, toISO } from "@/lib/booking/dates";
import { eur, frDate } from "@/lib/admin/labels";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createBlock, createRate, deleteBlock, deleteRate, saveBasePrices } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tarifs et fermetures" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const doneText: Record<string, string> = {
  prices: "Prix de base enregistrés.",
  rate: "Tarif saisonnier ajouté.",
  rate_deleted: "Tarif saisonnier supprimé.",
  block: "Fermeture ajoutée.",
  block_deleted: "Fermeture supprimée.",
};
const errorText: Record<string, string> = {
  price: "Prix invalide (entre 1 et 10 000).",
  rate: "Tarif invalide : vérifiez le nom, les dates et le montant (pourcentage entier entre −90 et +300).",
  block: "Fermeture invalide : vérifiez la chambre et les dates.",
};

const range = (start: Date, end: Date) =>
  `${frDate(start, { day: "numeric", month: "short", year: "numeric" })} → ${frDate(addDays(end, -1), { day: "numeric", month: "short", year: "numeric" })}`;

export default async function RatesPage({ searchParams }: Props) {
  const user = await requireUser();
  const manager = canManage(user.role);
  const sp = await searchParams;
  const today = todayInImlil();
  const [rooms, rates, blocks] = await Promise.all([
    getActiveRooms(),
    db.rateOverride.findMany({ where: { endDate: { gt: today } }, orderBy: { startDate: "asc" }, include: { room: { select: { name: true } } } }),
    db.roomBlock.findMany({ where: { endDate: { gt: today } }, orderBy: { startDate: "asc" }, include: { room: { select: { name: true } }, feed: { select: { channel: true } } } }),
  ]);

  const prefillRoom = rooms.some((r) => r.slug === sp.room) ? sp.room : "";
  const prefillFrom = sp.from && parseDay(sp.from) ? sp.from : "";
  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";
  const label = "grid gap-1 text-sm";
  const min = toISO(today);

  return (
    <div className="grid max-w-5xl gap-8">
      <header>
        <p className="label">Tarifs et fermetures</p>
        <h1 className="text-4xl">Prix, saisons et fermetures</h1>
      </header>

      {(sp.done || sp.error) && (
        <p role="status" className={`rounded-[10px] border p-4 text-sm ${sp.error ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          {sp.error === "block_booked"
            ? `Impossible de fermer : la réservation ${sp.ref} occupe déjà la chambre sur ces dates. Annulez-la ou changez les dates.`
            : sp.error
              ? (errorText[sp.error] ?? "Une erreur est survenue.")
              : doneText[sp.done ?? ""]}
        </p>
      )}

      {/* Base prices */}
      <section id="prices" className="grid scroll-mt-6 gap-4 rounded-[10px] border border-rule bg-snow p-5">
        <div>
          <h2 className="text-2xl">Prix de base par nuit</h2>
          <p className="text-sm text-muted">Petit-déjeuner inclus. Utilisé quand aucun tarif saisonnier ne s’applique.</p>
        </div>
        <form action={saveBasePrices} className="grid gap-4">
          <fieldset disabled={!manager} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rooms.map((r) => (
              <label key={r.id} className={label}>
                {r.name}
                <span className="relative">
                  <input name={`price_${r.id}`} type="number" min={1} max={10000} step={1} required defaultValue={Number(r.basePrice)} className={`${field} pe-8`} />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted">€</span>
                </span>
              </label>
            ))}
          </div>
          {manager ? <SubmitButton className="w-fit">Enregistrer les prix</SubmitButton> : <p className="text-xs text-muted">Seuls le propriétaire et les administrateurs peuvent modifier les prix.</p>}
          </fieldset>
        </form>
      </section>

      {/* Seasonal rates */}
      <section id="seasons" className="grid scroll-mt-6 gap-4 rounded-[10px] border border-rule bg-snow p-5">
        <div>
          <h2 className="text-2xl">Tarifs saisonniers</h2>
          <p className="text-sm text-muted">
            Un prix fixe ou un pourcentage sur le prix de base, pour une période. Un tarif propre à une chambre passe avant un tarif « toutes chambres ». Le séjour minimum s’applique aux réservations du site.
          </p>
        </div>
        {rates.length > 0 ? (
          <ul className="divide-y divide-rule rounded-[8px] border border-rule">
            {rates.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-muted">{r.room?.name ?? "Toutes les chambres"}</span>
                <span>{range(r.startDate, r.endDate)}</span>
                <span className="font-medium">{r.price != null ? `${eur(Number(r.price))} / nuit` : `${r.percent! > 0 ? "+" : ""}${r.percent} %`}</span>
                {r.minNights > 1 && <span className="text-muted">min. {r.minNights} nuits</span>}
                {manager && <form action={deleteRate.bind(null, r.id)} className="ms-auto">
                  <SubmitButton variant="danger" confirmLabel="Supprimer" confirm={`Supprimer le tarif « ${r.name} » ?`} className="px-3 py-1.5">
                    <Trash2 className="h-4 w-4" aria-label="Supprimer" />
                  </SubmitButton>
                </form>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucun tarif saisonnier à venir.</p>
        )}
        {manager && <details className="rounded-[8px] border border-dashed border-rule p-4" open={sp.error === "rate"}>
          <summary className="cursor-pointer text-sm font-medium text-earth">Ajouter un tarif saisonnier</summary>
          <form action={createRate} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className={label}>
              Nom
              <input name="name" required maxLength={80} placeholder="ex. Printemps, Nouvel An" className={field} />
            </label>
            <label className={label}>
              Chambre
              <select name="room" className={field}>
                <option value="">Toutes les chambres</option>
                {rooms.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Séjour minimum (nuits)
              <input name="minNights" type="number" min={1} max={30} defaultValue={1} className={field} />
            </label>
            <label className={label}>
              Première nuit
              <input name="from" type="date" required min={min} className={field} />
            </label>
            <label className={label}>
              Dernière nuit
              <input name="to" type="date" required min={min} className={field} />
            </label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <label className={label}>
                Type
                <select name="mode" className={field}>
                  <option value="price">Prix fixe €</option>
                  <option value="percent">% du prix de base</option>
                </select>
              </label>
              <label className={label}>
                Valeur
                <input name="value" type="number" required step={1} placeholder="ex. 120 ou 15 ou −10" className={field} />
              </label>
            </div>
            <SubmitButton className="w-fit sm:col-span-2 lg:col-span-3">Ajouter</SubmitButton>
          </form>
        </details>}
      </section>

      {/* Closures */}
      <section id="closures" className="grid scroll-mt-6 gap-4 rounded-[10px] border border-rule bg-snow p-5">
        <div>
          <h2 className="text-2xl">Fermetures</h2>
          <p className="text-sm text-muted">Une chambre fermée n’est plus réservable sur le site. Les séjours importés de Booking.com et Airbnb apparaissent ici aussi.</p>
        </div>
        {blocks.length > 0 ? (
          <ul className="divide-y divide-rule rounded-[8px] border border-rule">
            {blocks.map((b) => {
              const beds24Booking = b.externalUid?.startsWith("b24:bk:");
              const beds24Closure = b.externalUid?.startsWith("b24:cl:");
              return (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-medium">{b.room.name}</span>
                <span>{range(b.startDate, b.endDate)}</span>
                <span className="text-muted">
                  {beds24Booking
                    ? `Réservé · ${b.reason}`
                    : beds24Closure
                      ? "Fermée sur toutes les plateformes (Beds24)"
                      : b.source === "ICAL"
                        ? `Réservé sur ${b.feed?.channel ?? "iCal"}`
                        : b.source === "MAINTENANCE"
                          ? `Travaux${b.reason ? ` · ${b.reason}` : ""}`
                          : b.reason || "Fermée"}
                </span>
                {b.source !== "ICAL" || beds24Closure ? (
                  <form action={deleteBlock.bind(null, b.id)} className="ms-auto">
                    <SubmitButton variant="danger" confirmLabel="Rouvrir" confirm="Rouvrir la chambre sur ces dates ?" className="px-3 py-1.5">
                      <Trash2 className="h-4 w-4" aria-label="Supprimer" />
                    </SubmitButton>
                  </form>
                ) : (
                  <span className="ms-auto text-xs text-muted">à modifier sur {beds24Booking ? "la plateforme" : (b.feed?.channel ?? "la plateforme")}</span>
                )}
              </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucune fermeture à venir.</p>
        )}
        <details className="rounded-[8px] border border-dashed border-rule p-4" open={Boolean(prefillRoom || sp.error === "block" || sp.error === "block_booked")}>
          <summary className="cursor-pointer text-sm font-medium text-earth">Fermer une chambre</summary>
          <form action={createBlock} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className={label}>
              Chambre
              <select name="room" defaultValue={prefillRoom} required className={field}>
                {rooms.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Première nuit
              <input name="from" type="date" required min={min} defaultValue={prefillFrom} className={field} />
            </label>
            <label className={label}>
              Dernière nuit
              <input name="to" type="date" required min={min} defaultValue={prefillFrom} className={field} />
            </label>
            <label className={label}>
              Motif
              <select name="kind" className={field}>
                <option value="MANUAL">Fermée (usage privé, groupe…)</option>
                <option value="MAINTENANCE">Travaux / entretien</option>
              </select>
            </label>
            <label className={`${label} lg:col-span-2`}>
              Note (optionnelle)
              <input name="reason" maxLength={120} placeholder="ex. peinture, famille" className={field} />
            </label>
            <SubmitButton className="w-fit sm:col-span-2 lg:col-span-3">Fermer la chambre</SubmitButton>
          </form>
        </details>
      </section>
    </div>
  );
}
