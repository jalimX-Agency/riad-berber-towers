import Link from "next/link";
import { notFound } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/admin/guard";
import { actionLabel, eur, frDate, nextStatuses, paymentLabel, sourceLabel, statusLabel } from "@/lib/admin/labels";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { changeStatus, restore, saveNotes, savePayment } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

const doneText: Record<string, string> = {
  created: "Réservation créée.",
  CONFIRMED: "Réservation confirmée.",
  CANCELLED: "Réservation annulée. Les nuits sont de nouveau disponibles.",
  CHECKED_IN: "Arrivée enregistrée.",
  CHECKED_OUT: "Départ enregistré.",
  NO_SHOW: "Marquée comme non présentée.",
  payment: "Paiement enregistré.",
  notes: "Notes enregistrées.",
};
const emailText: Record<string, string> = {
  sent: "Email envoyé au client.",
  skipped: "Email non envoyé : Resend n’est pas configuré.",
  no_email: "Email non envoyé : ce client n’a pas d’adresse email.",
  failed: "L’email n’a pas pu être envoyé. Contactez le client directement.",
};
const errorText: Record<string, string> = {
  transition: "Cette action n’est plus possible : le statut a changé entre-temps.",
  restore: "Impossible de rétablir : la chambre est déjà prise ou fermée sur ces dates.",
  payment: "Montant invalide.",
};
const localeName: Record<string, string> = { en: "Anglais", fr: "Français", es: "Espagnol", ar: "Arabe" };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const b = await db.booking.findUnique({ where: { id }, select: { reference: true } });
  return { title: b?.reference ?? "Réservation" };
}

export default async function BookingPage({ params, searchParams }: Props) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const b = await db.booking.findUnique({ where: { id }, include: { guest: true, room: { select: { name: true, slug: true } } } });
  if (!b) notFound();

  const nightly = (Array.isArray(b.nightlyRates) ? b.nightlyRates : []) as { date: string; price: number }[];
  const computed = nightly.reduce((s, n) => s + n.price, 0);
  const phoneDigits = b.guest.phone.replace(/\D/g, "");
  const actions = nextStatuses[b.status];
  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="grid content-start gap-4 rounded-[10px] border border-rule bg-snow p-5">
      <h2 className="text-xl">{title}</h2>
      {children}
    </section>
  );
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-4 border-b border-rule py-2 text-sm last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-end font-medium">{v}</dd>
    </div>
  );

  return (
    <div className="grid gap-6">
      <Link href="/admin/bookings" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-earth">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Réservations
      </Link>

      {(sp.done || sp.error) && (
        <div role="status" className={`grid gap-1 rounded-[10px] border p-4 text-sm ${sp.error ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          {sp.done && <p>{doneText[sp.done] ?? "Enregistré."}</p>}
          {sp.email && <p className={sp.email === "sent" ? "" : "font-medium text-amber-900"}>{emailText[sp.email]}</p>}
          {sp.error && <p>{errorText[sp.error] ?? "Une erreur est survenue."}</p>}
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="font-mono text-sm text-earth">
            {b.reference} · {sourceLabel[b.source]}
          </p>
          <h1 className="text-4xl">
            {b.guest.firstName} {b.guest.lastName}
          </h1>
          <p className="text-muted">
            {b.room.name} · {frDate(b.checkIn, { day: "numeric", month: "long" })} → {frDate(b.checkOut, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <StatusBadge status={b.status} className="px-3 py-1 text-sm" />
      </header>

      {/* Status actions */}
      {(actions.length > 0 || b.status === "CANCELLED") && (
        <section className="flex flex-wrap items-center gap-3 rounded-[10px] border border-rule bg-snow p-4">
          {actions.map((to: BookingStatus) => {
            const emails = to === "CONFIRMED" || to === "CANCELLED";
            return (
              <form key={to} action={changeStatus.bind(null, b.id, to)} className="flex items-center gap-3">
                <SubmitButton
                  variant={to === "CANCELLED" || to === "NO_SHOW" ? "danger" : to === nextStatuses[b.status][0] ? "primary" : "outline"}
                  confirm={to === "CANCELLED" ? "Annuler cette réservation ? Les nuits redeviendront disponibles." : to === "NO_SHOW" ? "Marquer ce client comme non présenté ?" : undefined}
                >
                  {actionLabel[to]}
                </SubmitButton>
                {emails && b.guest.email && (
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" name="notify" defaultChecked className="accent-[var(--earth)]" />
                    prévenir par email
                  </label>
                )}
              </form>
            );
          })}
          {b.status === "CANCELLED" && (
            <form action={restore.bind(null, b.id)}>
              <SubmitButton variant="outline" confirm="Rétablir cette réservation (statut Confirmée) ?">
                Rétablir la réservation
              </SubmitButton>
            </form>
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid content-start gap-6">
          <Card title="Séjour">
            <dl>
              <Row k="Chambre" v={b.room.name} />
              <Row k="Arrivée" v={frDate(b.checkIn, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
              <Row k="Départ" v={frDate(b.checkOut, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
              <Row k="Durée" v={`${b.nights} nuit${b.nights > 1 ? "s" : ""}`} />
              <Row k="Personnes" v={`${b.adults} adulte${b.adults > 1 ? "s" : ""}${b.children ? `, ${b.children} enfant(s)` : ""}`} />
              <Row k="Heure d’arrivée prévue" v={b.arrivalTime || "—"} />
            </dl>
            {nightly.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted">Prix par nuit (au moment de la réservation)</summary>
                <ul className="mt-2 grid gap-1">
                  {nightly.map((n) => (
                    <li key={n.date} className="flex justify-between">
                      <span>{frDate(new Date(`${n.date}T00:00:00Z`), { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span>{eur(n.price, b.currency)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex items-baseline justify-between border-t border-ink pt-3">
              <span className="font-medium">Total</span>
              <span className="font-display text-3xl font-semibold">{eur(Number(b.total), b.currency)}</span>
            </div>
            {Math.round(computed) !== Math.round(Number(b.total)) && computed > 0 && (
              <p className="text-xs text-muted">Prix convenu. Le tarif calculé était {eur(computed, b.currency)}.</p>
            )}
          </Card>

          {b.specialRequests && (
            <Card title="Demandes du client">
              <p className="whitespace-pre-line text-sm" dir="auto">
                {b.specialRequests}
              </p>
            </Card>
          )}

          <Card title="Notes internes">
            <form action={saveNotes.bind(null, b.id)} className="grid gap-3">
              <label className="grid gap-1 text-sm">
                Heure d’arrivée
                <input name="arrivalTime" defaultValue={b.arrivalTime} placeholder="ex. 16-18" maxLength={20} className={field} />
              </label>
              <label className="grid gap-1 text-sm">
                Notes (visibles seulement par l’équipe)
                <textarea name="internalNotes" defaultValue={b.internalNotes} rows={4} maxLength={4000} className={field} />
              </label>
              <SubmitButton variant="outline" className="w-fit">
                Enregistrer
              </SubmitButton>
            </form>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card title="Client">
            <dl>
              <Row k="Nom" v={`${b.guest.firstName} ${b.guest.lastName}`} />
              <Row k="Email" v={b.guest.email || "—"} />
              <Row k="Téléphone" v={b.guest.phone || "—"} />
              <Row k="Pays" v={b.guest.country || "—"} />
              <Row k="Langue" v={localeName[b.locale]} />
            </dl>
            <div className="flex flex-wrap gap-2">
              {phoneDigits && (
                <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`${b.reference} · `)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm text-snow hover:bg-emerald-800">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                </a>
              )}
              {phoneDigits && (
                <a href={`tel:+${phoneDigits}`} className="inline-flex items-center gap-1.5 rounded-full border border-rule px-4 py-2 text-sm hover:border-earth">
                  <Phone className="h-4 w-4" aria-hidden="true" /> Appeler
                </a>
              )}
              {b.guest.email && (
                <a href={`mailto:${b.guest.email}?subject=${encodeURIComponent(`Riad Berber Towers · ${b.reference}`)}`} className="inline-flex items-center gap-1.5 rounded-full border border-rule px-4 py-2 text-sm hover:border-earth">
                  <Mail className="h-4 w-4" aria-hidden="true" /> Email
                </a>
              )}
            </div>
          </Card>

          <Card title="Paiement">
            <form action={savePayment.bind(null, b.id)} className="grid gap-3">
              <label className="grid gap-1 text-sm">
                Statut
                <select name="paymentStatus" defaultValue={b.paymentStatus} className={field}>
                  {Object.entries(paymentLabel).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Acompte reçu ({b.currency})
                <input name="depositAmount" type="number" min={0} step="1" defaultValue={Number(b.depositAmount)} className={field} />
              </label>
              <label className="grid gap-1 text-sm">
                Moyen de paiement
                <input name="paymentMethod" defaultValue={b.paymentMethod ?? ""} placeholder="espèces, carte, virement…" maxLength={40} className={field} />
              </label>
              <SubmitButton variant="outline" className="w-fit">
                Enregistrer
              </SubmitButton>
            </form>
          </Card>

          <Card title="Historique">
            <dl>
              <Row k="Créée le" v={new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(b.createdAt)} />
              <Row k="Modifiée le" v={new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(b.updatedAt)} />
              {b.cancelledAt && <Row k="Annulée le" v={new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(b.cancelledAt)} />}
              <Row k="Statut" v={statusLabel[b.status]} />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
