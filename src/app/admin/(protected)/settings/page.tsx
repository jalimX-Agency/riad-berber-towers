import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/admin/guard";
import { getSettings } from "@/lib/settings";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { DEPOSIT_PERCENT } from "@/lib/booking/policy";
import { updateSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paramètres" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const errorText: Record<string, string> = {
  email: "Adresse email invalide.",
  paypal: "Nom PayPal.me invalide. Exemple : riadberbertowers (ou le lien paypal.me/riadberbertowers).",
  role: "Seuls le propriétaire et les administrateurs peuvent modifier les paramètres.",
};

export default async function SettingsPage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const s = await getSettings();
  const canEdit = user.role !== "STAFF";
  const field = "w-full rounded-[8px] border border-rule bg-snow px-3 py-2 text-sm disabled:opacity-60";

  return (
    <div className="grid max-w-2xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-4xl">Paramètres</h1>
        <p className="text-muted">Le lien de paiement de l’acompte et l’adresse qui reçoit les notifications.</p>
      </header>

      {(sp.done || sp.error) && (
        <p role="status" className={`rounded-[10px] border p-4 text-sm ${sp.error ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          {sp.error ? (errorText[sp.error] ?? "Une erreur est survenue.") : "Paramètres enregistrés."}
        </p>
      )}

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
