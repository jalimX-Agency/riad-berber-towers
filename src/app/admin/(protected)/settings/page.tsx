import { ExternalLink } from "lucide-react";
import { canManage, requireUser } from "@/lib/admin/guard";
import { getSettings } from "@/lib/settings";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DEPOSIT_PERCENT } from "@/lib/booking/policy";
import { db } from "@/lib/db";
import { saveBasePrices, updateSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paramètres" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const errorText: Record<string, string> = {
  email: "Adresse email invalide.",
  paypal: "Nom PayPal.me invalide. Exemple : riadberbertowers (ou le lien paypal.me/riadberbertowers).",
  role: "Seuls le propriétaire et les administrateurs peuvent modifier les paramètres.",
  price: "Prix invalide : entre 1 et 10 000 € par nuit.",
  wise: "Lien Wise invalide. Exemple : https://wise.com/pay/me/omara1819",
  iban: "IBAN invalide (2 lettres, 2 chiffres, puis le numéro de compte).",
  swift: "Code SWIFT / BIC invalide (8 ou 11 caractères).",
};

export default async function SettingsPage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const [s, rooms] = await Promise.all([getSettings(), db.room.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true, basePrice: true } })]);
  const canEdit = canManage(user.role);
  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm disabled:opacity-60";

  return (
    <div className="grid max-w-2xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-4xl">Paramètres</h1>
        <p className="text-muted">Prix de base des chambres, moyens de paiement de l’acompte (PayPal, Wise, virement) et adresse des notifications.</p>
      </header>

      {(sp.done || sp.error) && (
        <p role="status" className={`rounded-[10px] border p-4 text-sm ${sp.error ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          {sp.error ? (errorText[sp.error] ?? "Une erreur est survenue.") : sp.done === "prices" ? "Prix de base enregistrés." : "Paramètres enregistrés."}
        </p>
      )}

      <form action={saveBasePrices} className="grid gap-4 rounded-[10px] border border-rule bg-snow p-5">
        <div>
          <h2 className="text-2xl">Prix de base par nuit (site)</h2>
          <p className="text-sm text-muted">Petit-déjeuner inclus. Utilisé pour les nuits sans prix propre dans le Calendrier, et affiché sur le site (« à partir de »). Les prix Booking.com et Airbnb se règlent dans le Calendrier.</p>
        </div>
        <fieldset disabled={!canEdit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((r) => (
              <label key={r.id} className="grid gap-1 text-sm">
                {r.name}
                <span className="relative">
                  <input name={`price_${r.id}`} type="number" min={1} max={10000} step={1} required defaultValue={Number(r.basePrice)} className={`${field} pe-8`} />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted">€</span>
                </span>
              </label>
            ))}
          </div>
          {canEdit && <SubmitButton className="w-fit">Enregistrer les prix</SubmitButton>}
        </fieldset>
      </form>

      <form action={updateSettings} className="grid gap-6 rounded-[10px] border border-rule bg-snow p-5">
        <fieldset disabled={!canEdit} className="grid gap-6">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">PayPal.me (acompte de {DEPOSIT_PERCENT} %)</span>
            <input name="paypalMe" defaultValue={s.paypalMe} placeholder="riadberbertowers" maxLength={200} dir="ltr" className={field} />
            <span className="text-xs text-muted">
              Le nom de votre lien paypal.me. La page de paiement du client affiche un bouton « Payer avec PayPal » avec le montant exact de l’acompte. Laissez vide pour demander au client de vous contacter sur WhatsApp.
            </span>
            {s.paypalMe && (
              <a href={`https://paypal.me/${s.paypalMe}`} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-xs text-earth underline underline-offset-4">
                Tester : paypal.me/{s.paypalMe}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Lien Wise</span>
            <input name="wiseLink" defaultValue={s.wiseLink} placeholder="https://wise.com/pay/me/…" maxLength={200} dir="ltr" className={field} />
            <span className="text-xs text-muted">Affiche un bouton « Payer avec Wise » et le QR code. Laissez vide pour le masquer.</span>
          </label>

          <fieldset className="grid gap-3 rounded-[8px] border border-rule p-4">
            <legend className="px-1 text-sm font-medium">Virement bancaire</legend>
            <p className="text-xs text-muted">Coordonnées affichées au client sur sa page de paiement. Laissez l’IBAN vide pour masquer le virement.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Banque
                <input name="bankName" defaultValue={s.bankName} maxLength={120} className={field} />
              </label>
              <label className="grid gap-1 text-sm">
                Titulaire du compte
                <input name="bankHolder" defaultValue={s.bankHolder} maxLength={120} className={field} />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                IBAN
                <input name="bankIban" defaultValue={s.bankIban} maxLength={60} dir="ltr" className={`${field} font-mono`} />
              </label>
              <label className="grid gap-1 text-sm">
                SWIFT / BIC
                <input name="bankSwift" defaultValue={s.bankSwift} maxLength={11} dir="ltr" className={`${field} font-mono`} />
              </label>
              <label className="grid gap-1 text-sm">
                Devise du compte
                <input name="bankCurrency" defaultValue={s.bankCurrency} maxLength={3} dir="ltr" className={field} />
              </label>
            </div>
          </fieldset>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Email des notifications</span>
            <input name="adminEmail" type="email" required defaultValue={s.adminEmail} maxLength={160} dir="ltr" className={field} />
            <span className="text-xs text-muted">Reçoit les nouvelles demandes de réservation et les preuves de paiement envoyées par les clients.</span>
          </label>

          {canEdit && <SubmitButton className="w-fit">Enregistrer</SubmitButton>}
        </fieldset>
        {!canEdit && <p className="text-xs text-muted">{errorText.role}</p>}
      </form>
    </div>
  );
}
