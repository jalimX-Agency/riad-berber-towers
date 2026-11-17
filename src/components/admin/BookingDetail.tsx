import Link from "next/link";
import { notFound } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { ArrowLeft, ArrowRight, BedDouble, ChevronDown, Expand, FileDown, FileText, Mail, MessageCircle, Phone, Users } from "lucide-react";
import { db } from "@/lib/db";
import { canManage, requireUser } from "@/lib/admin/guard";
import { actionLabel, bedLabel, eur, frDate, nextStatuses, paymentLabel, sourceLabel, statusLabel } from "@/lib/admin/labels";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CopyField } from "@/components/admin/CopyField";
import { PanelClose } from "@/components/admin/BookingPanel";
import {
  acceptBooking,
  approvePayment,
  changeStatus,
  declineBooking,
  deleteBooking,
  rejectProof,
  resendPaymentLink,
  restore,
  saveNotes,
  savePayment,
} from "@/app/admin/(protected)/bookings/actions";
import { payUrl } from "@/lib/email/booking";
import { CASH_CURRENCIES, DEPOSIT_PERCENT } from "@/lib/booking/policy";
import { bookingPayment } from "@/lib/booking/payment";
import { cn } from "@/lib/utils";
import { extraLines, extrasInclude } from "@/lib/booking/extra-names";

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
const stamp = (d: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(d);

/** "Prochaine étape" copy and tone, by status. */
const stepTone: Partial<Record<BookingStatus, { tone: string; title: string }>> = {
  PENDING: { tone: "border-amber-300 bg-amber-50", title: "Nouvelle demande à traiter" },
  AWAITING_PAYMENT: { tone: "border-orange-200 bg-orange-50", title: "En attente du paiement de l’acompte" },
  PAYMENT_REVIEW: { tone: "border-violet-300 bg-violet-50", title: "Preuve de paiement à vérifier" },
  CONFIRMED: { tone: "border-emerald-300 bg-emerald-50", title: "Réservation confirmée" },
  CHECKED_IN: { tone: "border-sky-300 bg-sky-50", title: "Client sur place" },
  CANCELLED: { tone: "border-rule bg-paper", title: "Réservation annulée" },
};

function Notify({ label = "prévenir le client par email" }: { label?: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      <input type="checkbox" name="notify" defaultChecked className="accent-[var(--earth)]" />
      {label}
    </label>
  );
}

function Section({ title, children, className, aside }: { title: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <section className={cn("grid content-start gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-granite">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * The whole booking, readable top to bottom: who, when, what to do next, money, proofs, notes.
 * Rendered as a full page (/admin/bookings/[id]) or inside the side panel opened from the lists.
 */
export async function BookingDetail({
  id,
  sp,
  mode,
  returnTo,
}: {
  id: string;
  sp: Record<string, string | undefined>;
  mode: "page" | "panel";
  /** panel: the page underneath, where actions come back to (with ?b=<id>) and where "close" goes */
  returnTo?: string;
}) {
  const user = await requireUser();
  const b = await db.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      room: { select: { name: true, slug: true } },
      // never load the file bytes here
      proofs: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      ...extrasInclude,
    },
  });
  if (!b) notFound();

  const nightly = (Array.isArray(b.nightlyRates) ? b.nightlyRates : []) as { date: string; price: number }[];
  const computed = nightly.reduce((s, n) => s + n.price, 0);
  const pay = bookingPayment(b);
  const extras = extraLines(b.extras, "fr", "Transfert depuis Marrakech", "Dîner au riad");
  const phoneDigits = b.guest.phone.replace(/\D/g, "");
  const actions = nextStatuses[b.status];
  const step = stepTone[b.status];
  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm";
  const depositPaid = b.paymentStatus === "DEPOSIT_PAID" || b.paymentStatus === "PAID";
  const voucher = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status);
  // in the side panel, every form tells the action which page to come back to (see back() in the actions)
  const R = mode === "panel" && returnTo ? <input type="hidden" name="_return" value={returnTo} /> : null;


  return (
    <article className="grid gap-7">
      {/* top bar */}
      <div className={cn("flex flex-wrap items-center justify-between gap-3", mode === "panel" && "sticky top-0 z-10 -mx-5 border-b border-rule bg-snow/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8")}>
        {mode === "page" ? (
          <Link href="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-earth">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Réservations
          </Link>
        ) : (
          <span className="font-mono text-sm text-earth">{b.reference}</span>
        )}
        <div className="flex items-center gap-2">
          {mode === "panel" && (
            <a href={`/admin/bookings/${b.id}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-paper hover:text-ink" title="Ouvrir en pleine page">
              <Expand className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Pleine page</span>
            </a>
          )}
          {mode === "panel" && returnTo && <PanelClose href={returnTo} />}
        </div>
      </div>

      {(sp.done || sp.error) && (
        <div role="status" className={`grid gap-1 rounded-[10px] border p-4 text-sm ${sp.error ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          {sp.done && <p>{doneText[sp.done] ?? "Enregistré."}</p>}
          {sp.email && <p className={sp.email === "sent" ? "" : "font-medium text-amber-900"}>{emailText[sp.email]}</p>}
          {sp.error && <p>{errorText[sp.error] ?? "Une erreur est survenue."}</p>}
        </div>
      )}

      {/* who */}
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={b.status} className="px-3 py-1 text-sm" />
          <span className="text-sm text-muted">
            {mode === "page" && <span className="font-mono text-earth">{b.reference} · </span>}
            {sourceLabel[b.source]} · reçue le {stamp(b.createdAt)}
          </span>
        </div>
        <h1 className="text-4xl leading-tight sm:text-5xl">
          {b.guest.firstName} {b.guest.lastName}
        </h1>
        <p className="text-sm text-muted">
          {[b.guest.country, localeName[b.locale], b.guest.email, b.guest.phone].filter(Boolean).join(" · ")}
        </p>
        <div className="flex flex-wrap gap-2">
          {phoneDigits && (
            <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`${b.reference} · `)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm text-snow hover:bg-emerald-800">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
            </a>
          )}
          {phoneDigits && (
            <a href={`tel:+${phoneDigits}`} className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-snow px-4 py-2 text-sm hover:border-earth">
              <Phone className="h-4 w-4" aria-hidden="true" /> Appeler
            </a>
          )}
          {b.guest.email && (
            <a href={`mailto:${b.guest.email}?subject=${encodeURIComponent(`Riad Berber Towers · ${b.reference}`)}`} className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-snow px-4 py-2 text-sm hover:border-earth">
              <Mail className="h-4 w-4" aria-hidden="true" /> Email
            </a>
          )}
          {voucher && (
            <a href={`/admin/bookings/${b.id}/voucher`} className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-snow px-4 py-2 text-sm hover:border-earth">
              <FileDown className="h-4 w-4" aria-hidden="true" /> Fiche PDF
            </a>
          )}
        </div>
      </header>

      {/* when */}
      <div className="grid overflow-hidden rounded-[12px] border border-rule bg-snow sm:grid-cols-[1fr_auto_1fr_1.1fr]">
        <div className="grid gap-0.5 p-4">
          <span className="text-xs uppercase tracking-[0.14em] text-granite">Arrivée</span>
          <span className="font-display text-2xl leading-tight first-letter:uppercase">{frDate(b.checkIn, { weekday: "short", day: "numeric", month: "short" })}</span>
          <span className="text-xs text-muted">{b.arrivalTime ? `vers ${b.arrivalTime}` : frDate(b.checkIn, { year: "numeric" })}</span>
        </div>
        <span className="hidden place-items-center px-1 text-muted sm:grid" aria-hidden="true">
          <ArrowRight className="h-5 w-5" />
        </span>
        <div className="grid gap-0.5 border-t border-rule p-4 sm:border-t-0">
          <span className="text-xs uppercase tracking-[0.14em] text-granite">Départ</span>
          <span className="font-display text-2xl leading-tight first-letter:uppercase">{frDate(b.checkOut, { weekday: "short", day: "numeric", month: "short" })}</span>
          <span className="text-xs text-muted">{frDate(b.checkOut, { year: "numeric" })}</span>
        </div>
        <div className="grid content-center gap-1.5 border-t border-rule bg-paper/60 p-4 text-sm sm:border-s sm:border-t-0">
          <span className="inline-flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-earth" aria-hidden="true" />
            <b className="font-medium">{b.room.name}</b>
          </span>
          <span className="inline-flex items-center gap-2 text-muted">
            <Users className="h-4 w-4 text-earth" aria-hidden="true" />
            {b.nights} nuit{b.nights > 1 ? "s" : ""} · {b.adults} adulte{b.adults > 1 ? "s" : ""}
          </span>
          <span className={cn("inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-0.5 text-xs ring-1", b.bedSetup === "TWIN" ? "bg-sky-50 text-sky-900 ring-sky-200" : "bg-stone-100 text-stone-800 ring-stone-300")}>
            {bedLabel[b.bedSetup]}
          </span>
        </div>
      </div>

      {/* what to do next */}
      {(step || actions.length > 0) && (
        <section className={cn("grid gap-3 rounded-[12px] border p-5", step?.tone ?? "border-rule bg-snow")}>
          <h2 className="text-lg font-medium">{step?.title ?? "Actions"}</h2>

          {b.status === "PENDING" && (
            <>
              <p className="text-sm">
                Si la chambre est libre, acceptez : le client reçoit un lien pour payer l’acompte de {DEPOSIT_PERCENT} % (<b>{eur(pay.deposit, b.currency)}</b>) par PayPal et envoyer la preuve.
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <form action={acceptBooking.bind(null, b.id)} className="flex flex-wrap items-center gap-3">
                {R}
                  <SubmitButton>Accepter et demander l’acompte</SubmitButton>
                  {b.guest.email && <Notify label="envoyer l’email" />}
                </form>
                <form action={declineBooking.bind(null, b.id)} className="flex flex-wrap items-center gap-3">
                {R}
                  <SubmitButton variant="danger" confirmLabel="Refuser la demande" confirm="Refuser cette demande ? Le client sera prévenu qu’aucune chambre n’est disponible.">
                    Refuser (pas de disponibilité)
                  </SubmitButton>
                  {b.guest.email && <Notify label="prévenir" />}
                </form>
              </div>
            </>
          )}

          {(b.status === "AWAITING_PAYMENT" || b.status === "PAYMENT_REVIEW") && b.payToken && (
            <>
              <p className="text-sm">
                {b.status === "AWAITING_PAYMENT" ? (
                  <>
                    Le client doit payer <b>{eur(pay.deposit, b.currency)}</b> et envoyer la preuve depuis sa page de paiement.
                  </>
                ) : (
                  <>
                    Vérifiez que vous avez bien reçu <b>{eur(pay.deposit, b.currency)}</b> (preuve ci-dessous), puis validez.
                  </>
                )}
              </p>
              <CopyField label="Page de paiement du client" value={payUrl(b.locale, b.payToken)} />
            </>
          )}

          {b.status === "PAYMENT_REVIEW" && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <form action={approvePayment.bind(null, b.id)} className="flex flex-wrap items-center gap-3">
                {R}
                <SubmitButton>Valider le paiement et confirmer</SubmitButton>
                {b.guest.email && <Notify label="envoyer la confirmation + fiche PDF" />}
              </form>
              <form action={rejectProof.bind(null, b.id)} className="flex flex-wrap items-center gap-3">
                {R}
                <SubmitButton variant="outline" confirmLabel="Refuser la preuve" confirm="Refuser cette preuve ? Le client devra en envoyer une nouvelle.">
                  Refuser la preuve
                </SubmitButton>
                {b.guest.email && <Notify label="prévenir" />}
              </form>
            </div>
          )}

          {(actions.length > 0 || b.status === "CANCELLED" || (b.status === "AWAITING_PAYMENT" && b.guest.email)) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink/10 pt-3">
              {b.status === "AWAITING_PAYMENT" && b.guest.email && (
                <form action={resendPaymentLink.bind(null, b.id)}>
                {R}
                  <SubmitButton variant="outline">Renvoyer le lien</SubmitButton>
                </form>
              )}
              {actions.map((to: BookingStatus) => (
                <form key={to} action={changeStatus.bind(null, b.id, to)} className="flex flex-wrap items-center gap-3">
                {R}
                  <SubmitButton
                    variant={to === "CANCELLED" || to === "NO_SHOW" ? "danger" : to === actions[0] && b.status !== "AWAITING_PAYMENT" ? "primary" : "outline"}
                    confirm={to === "CANCELLED" ? "Annuler cette réservation ? Les nuits redeviendront disponibles." : to === "NO_SHOW" ? "Marquer ce client comme non présenté ?" : undefined}
                    confirmLabel={to === "CANCELLED" ? "Annuler la réservation" : "Confirmer"}
                  >
                    {actionLabel[to]}
                  </SubmitButton>
                  {(to === "CONFIRMED" || to === "CANCELLED") && b.guest.email && <Notify label="prévenir" />}
                </form>
              ))}
              {b.status === "CANCELLED" && (
                <form action={restore.bind(null, b.id)}>
                {R}
                  <SubmitButton variant="outline" confirmLabel="Rétablir" confirm="Rétablir cette réservation (statut Confirmée) ?">
                    Rétablir la réservation
                  </SubmitButton>
                </form>
              )}
            </div>
          )}
        </section>
      )}

      {/* money */}
      <Section title="Paiement" aside={<span className={cn("rounded-full px-2.5 py-0.5 text-xs ring-1", depositPaid ? "bg-emerald-100 text-emerald-900 ring-emerald-300" : "bg-stone-100 text-stone-700 ring-stone-300")}>{paymentLabel[b.paymentStatus]}</span>}>
        <div className="grid grid-cols-3 overflow-hidden rounded-[12px] border border-rule bg-snow text-center">
          <div className="grid gap-0.5 p-4">
            <span className="text-xs text-muted">Total</span>
            <span className="font-display text-2xl font-semibold sm:text-3xl">{eur(pay.total, b.currency)}</span>
          </div>
          <div className={cn("grid gap-0.5 border-s border-rule p-4", depositPaid && "bg-emerald-50")}>
            <span className="text-xs text-muted">Acompte {DEPOSIT_PERCENT} %</span>
            <span className="font-display text-2xl font-semibold sm:text-3xl">{eur(pay.deposit, b.currency)}</span>
            <span className="text-[11px] text-muted">{depositPaid ? "reçu" : "non remboursable"}</span>
          </div>
          <div className="grid gap-0.5 border-s border-rule p-4">
            <span className="text-xs text-muted">Reste en espèces</span>
            <span className="font-display text-2xl font-semibold sm:text-3xl">{eur(pay.balance, b.currency)}</span>
            <span className="text-[11px] text-muted">{CASH_CURRENCIES.join(" · ")}</span>
          </div>
        </div>
        {Math.round(computed) !== Math.round(Number(b.roomTotal)) && computed > 0 && <p className="text-xs text-muted">Prix convenu. Le tarif calculé était {eur(computed, b.currency)}.</p>}
        {extras.length > 0 && (
          <ul className="grid divide-y divide-rule rounded-[10px] border border-rule bg-snow text-sm">
            <li className="flex justify-between gap-3 px-4 py-2.5 text-muted">
              <span>Chambre</span>
              <span>{eur(Number(b.roomTotal), b.currency)}</span>
            </li>
            {extras.map((x) => (
              <li key={x.slug} className="flex justify-between gap-3 px-4 py-2.5">
                <span>
                  {x.name}
                  {!x.transfer && <span className="text-muted"> · {x.people} {x.slug === "dinner" ? "couvert(s)" : "pers."}</span>}
                </span>
                <span className={x.transfer ? "text-muted" : ""}>{x.transfer && !x.total ? "prix à confirmer" : eur(x.total, b.currency)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2">
          {nightly.length > 0 && (
            <details className="group rounded-[10px] border border-rule bg-snow">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm">
                Prix par nuit <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ul className="grid gap-1 border-t border-rule px-4 py-3 text-sm">
                {nightly.map((n) => (
                  <li key={n.date} className="flex justify-between">
                    <span className="text-muted">{frDate(new Date(`${n.date}T00:00:00Z`), { weekday: "short", day: "numeric", month: "short" })}</span>
                    <span>{eur(n.price, b.currency)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <details className="group rounded-[10px] border border-rule bg-snow" open={sp.error === "payment"}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm">
              Modifier le paiement <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <form key={`${b.paymentStatus}-${Number(b.depositAmount)}`} action={savePayment.bind(null, b.id)} className="grid gap-3 border-t border-rule p-4 sm:grid-cols-3">
                {R}
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
                Acompte ({b.currency})
                <input name="depositAmount" type="number" min={0} step="1" defaultValue={Number(b.depositAmount)} className={field} />
              </label>
              <label className="grid gap-1 text-sm">
                Moyen de paiement
                <input name="paymentMethod" defaultValue={b.paymentMethod ?? ""} placeholder="PayPal, espèces…" maxLength={40} className={field} />
              </label>
              <SubmitButton variant="outline" className="w-fit sm:col-span-3">
                Enregistrer
              </SubmitButton>
            </form>
          </details>
        </div>
      </Section>

      {/* proofs */}
      {b.proofs.length > 0 && (
        <Section title={`Preuves de paiement (${b.proofs.length})`}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {b.proofs.map((p) => (
              <li key={p.id} className="grid content-start gap-2 rounded-[10px] border border-rule bg-snow p-3">
                {p.mimeType.startsWith("image/") ? (
                  <a href={`/admin/proofs/${p.id}`} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[6px] border border-rule bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element -- private file served by an authenticated admin route */}
                    <img loading="lazy" decoding="async" src={`/admin/proofs/${p.id}`} alt={`Preuve de paiement ${p.filename}`} className="max-h-72 w-full object-contain" />
                  </a>
                ) : (
                  <a href={`/admin/proofs/${p.id}`} target="_blank" rel="noopener noreferrer" className="grid h-28 place-items-center rounded-[6px] border border-rule bg-paper text-earth">
                    <FileText className="h-8 w-8" aria-hidden="true" />
                  </a>
                )}
                <span className="truncate text-xs text-muted" title={p.filename}>
                  {p.filename} · {Math.max(1, Math.round(p.size / 1024))} Ko · {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" }).format(p.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* requests and notes */}
      <Section title="Demandes et notes">
        {b.specialRequests && (
          <blockquote className="whitespace-pre-line rounded-[10px] border-s-4 border-earth bg-snow px-4 py-3 text-sm" dir="auto">
            <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-granite">Demande du client</span>
            {b.specialRequests}
          </blockquote>
        )}
        <form action={saveNotes.bind(null, b.id)} className="grid gap-3 rounded-[10px] border border-rule bg-snow p-4">
                {R}
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <label className="grid content-start gap-1 text-sm">
              Heure d’arrivée
              <input name="arrivalTime" defaultValue={b.arrivalTime} placeholder="ex. 16-18" maxLength={20} className={field} />
            </label>
            <label className="grid gap-1 text-sm">
              Notes internes (équipe seulement)
              <textarea name="internalNotes" defaultValue={b.internalNotes} rows={3} maxLength={4000} className={field} />
            </label>
          </div>
          <SubmitButton variant="outline" className="w-fit">
            Enregistrer les notes
          </SubmitButton>
        </form>
      </Section>

      {/* history and danger zone */}
      <footer className="grid gap-3 border-t border-rule pt-4 text-xs text-muted">
        <p>
          Créée le {stamp(b.createdAt)} · modifiée le {stamp(b.updatedAt)}
          {b.cancelledAt && ` · annulée le ${stamp(b.cancelledAt)}`} · statut : {statusLabel[b.status]}
        </p>
        {canManage(user.role) && (
          <details className="rounded-[10px] border border-rose-200 bg-rose-50/50">
            <summary className="cursor-pointer px-4 py-3 text-sm text-rose-900">Zone dangereuse</summary>
            <div className="grid gap-3 border-t border-rose-200 p-4">
              <p className="text-sm text-rose-900/80">
                Supprimer définitivement cette réservation (test, doublon, spam). Ses preuves de paiement sont effacées, et le client aussi s’il n’a pas d’autre réservation. Pour un vrai séjour annulé, préférez « Annuler » : l’historique est conservé.
              </p>
              <form action={deleteBooking.bind(null, b.id)}>
                {R}
                <SubmitButton variant="danger" confirmLabel="Supprimer définitivement" confirm={`Supprimer définitivement ${b.reference} ? Ses preuves de paiement seront effacées. C’est irréversible.`}>
                  Supprimer définitivement
                </SubmitButton>
              </form>
            </div>
          </details>
        )}
      </footer>
    </article>
  );
}
