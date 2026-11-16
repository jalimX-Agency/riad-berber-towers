import { RefreshCw, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { canManage, requireUser } from "@/lib/admin/guard";
import { exportToken } from "@/lib/ical/ical";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CopyField } from "@/components/admin/CopyField";
import { addFeed, removeFeed, syncNow } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking.com et Airbnb" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };
const channelName: Record<string, string> = { "booking.com": "Booking.com", airbnb: "Airbnb", other: "Autre" };
const when = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(d) : "jamais";

export default async function ChannelsPage({ searchParams }: Props) {
  const user = await requireUser();
  const manager = canManage(user.role);
  const sp = await searchParams;
  const rooms = await db.room.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, slug: true, name: true, icalFeeds: { orderBy: { createdAt: "asc" }, include: { _count: { select: { blocks: true } } } } },
  });
  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";

  const message =
    sp.done === "added"
      ? `Calendrier ajouté et importé : ${sp.events} séjour(s) trouvé(s).`
      : sp.done === "removed"
        ? "Calendrier retiré. Ses séjours importés ont été supprimés."
        : sp.done === "synced"
          ? `Synchronisation terminée : ${sp.ok} / ${sp.total} calendrier(s) importé(s) sans erreur.`
          : sp.error === "url"
            ? "Lien invalide : collez le lien iCal complet (https://…) fourni par la plateforme."
            : sp.error === "sync"
              ? `Calendrier ajouté, mais l’import a échoué : ${sp.detail}. Vérifiez le lien.`
              : "";

  return (
    <div className="grid max-w-5xl gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Synchronisation iCal</p>
          <h1 className="text-4xl">Booking.com et Airbnb</h1>
        </div>
        <form action={syncNow}>
          <SubmitButton variant="outline">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Synchroniser maintenant
          </SubmitButton>
        </form>
      </header>

      {message && (
        <p role="status" className={`rounded-[10px] border p-4 text-sm ${sp.error ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          {message}
        </p>
      )}

      <section className="grid gap-2 rounded-[10px] border border-rule bg-snow p-5 text-sm">
        <h2 className="text-xl">Comment ça marche</h2>
        <ol className="grid list-decimal gap-1.5 ps-5 text-muted">
          <li>
            <strong className="text-ink">Vers les plateformes :</strong> copiez le lien d’export de chaque chambre et collez-le dans Booking.com (Tarifs et disponibilités → Synchroniser les calendriers) et Airbnb (Calendrier → Disponibilité → Associer des calendriers). Elles bloqueront les nuits réservées sur ce site.
          </li>
          <li>
            <strong className="text-ink">Depuis les plateformes :</strong> copiez leur lien iCal d’export pour la même chambre et ajoutez-le ci-dessous. Les séjours importés ferment la chambre sur ce site.
          </li>
          <li>Les plateformes relisent les calendriers toutes les quelques heures : une double réservation reste possible dans ce délai. Le calendrier signale tout conflit en rouge.</li>
        </ol>
      </section>

      <ul className="grid gap-4">
        {rooms.map((room) => (
          <li key={room.id} className="grid gap-4 rounded-[10px] border border-rule bg-snow p-5">
            <h2 className="text-2xl">{room.name}</h2>
            <div className="grid gap-1 text-sm">
              <span className="text-muted">Lien d’export (à coller dans Booking.com / Airbnb)</span>
              <CopyField value={`${site.url}/api/ical/${room.slug}-${exportToken(room.slug)}.ics`} />
            </div>

            <div className="grid gap-2 text-sm">
              <span className="text-muted">Calendriers importés</span>
              {room.icalFeeds.length === 0 ? (
                <p className="text-muted">Aucun.</p>
              ) : (
                <ul className="divide-y divide-rule rounded-[8px] border border-rule">
                  {room.icalFeeds.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                      <span className="font-medium">{channelName[f.channel] ?? f.channel}</span>
                      <span className="text-muted">
                        {f._count.blocks} séjour(s) · dernière synchro {when(f.lastSyncedAt)}
                      </span>
                      {f.lastError && <span className="w-full text-rose-800">Erreur : {f.lastError}</span>}
                      {manager && <form action={removeFeed.bind(null, f.id)} className="ms-auto">
                        <SubmitButton variant="danger" confirmLabel="Retirer" confirm="Retirer ce calendrier ? Ses séjours importés seront supprimés de ce site." className="px-3 py-1.5">
                          <Trash2 className="h-4 w-4" aria-label="Retirer" />
                        </SubmitButton>
                      </form>}
                    </li>
                  ))}
                </ul>
              )}
              {manager && <form action={addFeed} className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                <input type="hidden" name="room" value={room.slug} />
                <select name="channel" className={field} aria-label="Plateforme">
                  <option value="booking.com">Booking.com</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="other">Autre</option>
                </select>
                <input name="url" type="url" required placeholder="https://… lien iCal de la plateforme" className={field} aria-label="Lien iCal" />
                <SubmitButton variant="outline">Ajouter</SubmitButton>
              </form>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
