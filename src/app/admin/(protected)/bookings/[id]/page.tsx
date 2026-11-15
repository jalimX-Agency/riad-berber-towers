import Link from "next/link";
import { notFound } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { ArrowLeft, FileDown, FileText, Mail, MessageCircle, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/admin/guard";
import { actionLabel, eur, frDate, nextStatuses, paymentLabel, sourceLabel, statusLabel } from "@/lib/admin/labels";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { acceptBooking, approvePayment, changeStatus, declineBooking, deleteBooking, rejectProof, resendPaymentLink, restore, saveNotes, savePayment } from "../actions";
import { CopyField } from "@/components/admin/CopyField";
import { payUrl } from "@/lib/email/booking";
import { CASH_CURRENCIES, DEPOSIT_PERCENT } from "@/lib/booking/policy";
import { bookingPayment } from "@/lib/booking/payment";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

const doneText: Record<string, string> = {
  created: "Réservation créée.",
  accepted: "Demande acceptée. Le client doit maintenant payer l’acompte et envoyer la preuve.",
  declined: "Demande refusée. Les nuits sont de nouveau disponibles.",
  proofRejected: "Preuve refusée. Le client peut en envoyer une nouvelle.",
  resent: "Lien de paiement renvoyé.",
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
const localeName: Record<string, string> = { en: "Anglais", fr: "Français", es: "Espagnol", de: "Allemand", ar: "Arabe" };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const b = await db.booking.findUnique({ where: { id }, select: { reference: true } });
  return { title: b?.reference ?? "Réservation" };
}

export default async function BookingPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const b = await db.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      room: { select: { name: true, slug: true } },
      // never load the file bytes here
      proofs: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!b) notFound();

  const nightly = (Array.isArray(b.nightlyRates) ? b.nightlyRates : []) as { date: string; price: number }[];
  const computed = nightly.reduce((s, n) => s + n.price, 0);
  const pay = bookingPayment(b);
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

      {/* Payment flow: accept / decline a request, then check the proof */}
      {b.status === "PENDING" && (
        <section className="grid gap-3 rounded-[10px] border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm">
            <b>Nouvelle demande.</b> Acceptez-la si la chambre est libre : le client reçoit un lien pour payer l’acompte de {DEPOSIT_PERCENT} % ({eur(pay.deposit, b.currency)}) par PayPal et envoyer la preuve.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <form action={acceptBooking.bind(null, b.id)} className="flex items-center gap-3">
              <SubmitButton>Accepter et demander l’acompte</SubmitButton>
              {b.guest.email && (
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" name="notify" defaultChecked className="accent-[var(--earth)]" />
                  envoyer l’email au client
                </label>
              )}
            </form>
            <form action={declineBooking.bind(null, b.id)} className="flex items-center gap-3">
              <SubmitButton variant="danger" confirm="Refuser cette demande ? Le client sera prévenu qu’aucune chambre n’est disponible.">
                Refuser (pas de disponibilité)
              </SubmitButton>
              {b.guest.email && (
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" name="notify" defaultChecked className="accent-[var(--earth)]" />
                  prévenir par email
                </label>
              )}
            </form>
          </div>
        </section>
      )}

      {(b.status === "AWAITING_PAYMENT" || b.status === "PAYMENT_REVIEW") && b.payToken && (
        <section className="grid gap-3 rounded-[10px] border border-rule bg-snow p-4">
          <p className="text-sm">
            {b.status === "AWAITING_PAYMENT" ? (
              <>
                <b>Paiement attendu.</b> Le client doit payer {eur(pay.deposit, b.currency)} et envoyer la preuve depuis sa page de paiement.
              </>
            ) : (
              <>
                <b>Preuve reçue.</b> Vérifiez que vous avez bien reçu {eur(pay.deposit, b.currency)}, puis validez le paiement.
              </>
            )}
          </p>
          <CopyField label="Page de paiement du client" value={payUrl(b.locale, b.payToken)} />
          {b.status === "AWAITING_PAYMENT" && b.guest.email && (
            <form action={resendPaymentLink.bind(null, b.id)}>
              <SubmitButton variant="outline">Renvoyer le lien par email</SubmitButton>
            </form>
          )}
        </section>
      )}

      {b.proofs.length > 0 && (
        <section className="grid gap-3 rounded-[10px] border border-violet-300 bg-violet-50 p-4">
          <h2 className="text-xl">Preuves de paiement</h2>
          <ul className="grid gap-3">
            {b.proofs.map((p) => (
              <li key={p.id} className="grid gap-2 rounded-[8px] border border-rule bg-snow p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-earth" aria-hidden="true" />
                    {p.filename} · {Math.round(p.size / 1024)} Ko · {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" }).format(p.createdAt)}
                  </span>
                  <a href={`/admin/proofs/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-earth underline underline-offset-4">
                    Ouvrir
                  </a>
                </div>
                {p.mimeType.startsWith("image/") && (
                  // eslint-disable-next-line @next/next/no-img-element -- private file served by an authenticated admin route
                  <img loading="lazy" decoding="async" src={`/admin/proofs/${p.id}`} alt={`Preuve de paiement ${p.filename}`} className="max-h-[420px] w-auto rounded-[6px] border border-rule" />
                )}
              </li>
            ))}
          </ul>
          {b.status === "PAYMENT_REVIEW" && (
            <div className="flex flex-wrap items-center gap-3">
              <form action={approvePayment.bind(null, b.id)} className="flex items-center gap-3">
                <SubmitButton>Valider le paiement et confirmer</SubmitButton>
                {b.guest.email && (
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" name="notify" defaultChecked className="accent-[var(--earth)]" />
                    envoyer la confirmation + fiche PDF
                  </label>
                )}
              </form>
              <form action={rejectProof.bind(null, b.id)} className="flex items-center gap-3">
                <SubmitButton variant="outline" confirm="Refuser cette preuve ? Le client devra en envoyer une nouvelle.">
                  Refuser la preuve
                </SubmitButton>
                {b.guest.email && (
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" name="notify" defaultChecked className="accent-[var(--earth)]" />
                    prévenir par email
                  </label>
                )}
              </form>
            </div>
          )}
        </section>
      )}

      {["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status) && (
        <a href={`/admin/bookings/${b.id}/voucher`} className="inline-flex w-fit items-center gap-1.5 rounded-full border border-rule bg-snow px-4 py-2 text-sm hover:border-earth">
          <FileDown className="h-4 w-4" aria-hidden="true" /> Fiche de réservation (PDF)
        </a>
      )}

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
            <dl>
              <Row k={`Acompte pour confirmer (${DEPOSIT_PERCENT} %, non remboursable)`} v={eur(pay.deposit, b.currency)} />
              <Row k="Reste en espèces à l’arrivée" v={eur(pay.balance, b.currency)} />
              <Row k="Devises acceptées" v={CASH_CURRENCIES.join(", ")} />
            </dl>
            <form key={`${b.paymentStatus}-${Number(b.depositAmount)}`} action={savePayment.bind(null, b.id)} className="grid gap-3">
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
                Montant de l’acompte ({b.currency})
                <input name="depositAmount" type="number" min={0} step="1" defaultValue={Number(b.depositAmount)} className={field} />
              </label>
              <label className="grid gap-1 text-sm">
                Moyen de paiement
                <input name="paymentMethod" defaultValue={b.paymentMethod ?? ""} placeholder="virement, espèces…" maxLength={40} className={field} />
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

          {canManage(user.role) && (
            <section className="grid gap-3 rounded-[10px] border border-rose-300 bg-rose-50/60 p-5">
              <h2 className="text-xl text-rose-900">Zone dangereuse</h2>
              <p className="text-sm text-rose-900/80">
                Supprimer définitivement cette réservation (test, doublon, spam). Ses preuves de paiement sont effacées, et le client aussi s’il n’a pas d’autre réservation. Pour un vrai séjour annulé, préférez « Annuler » : l’historique est conservé.
              </p>
              <form action={deleteBooking.bind(null, b.id)}>
                <SubmitButton variant="danger" confirm={`Supprimer définitivement ${b.reference} ? C’est irréversible.`}>
                  Supprimer définitivement
                </SubmitButton>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
