"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Lock } from "lucide-react";
import { requestBooking, type BookState } from "@/app/[locale]/book/actions";
import { ARRIVAL_TIMES } from "@/lib/booking/arrival";
import { cn } from "@/lib/utils";

type Props = { room: string; checkIn: string; checkOut: string; adults: number };

export function GuestForm({ room, checkIn, checkOut, adults }: Props) {
  const t = useTranslations("book");
  const locale = useLocale();
  const [state, action, pending] = useActionState<BookState, FormData>(requestBooking, {});
  const v = state.values ?? {};
  const bad = (f: string) => state.fields?.includes(f);

  const input =
    "w-full rounded-[8px] border border-rule bg-snow px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-earth aria-[invalid=true]:border-earth";
  const label = "grid gap-1.5 text-sm";

  return (
    <form action={action} className="grid gap-5" noValidate={false}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="room" value={room} />
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />
      <input type="hidden" name="adults" value={adults} />
      {/* honeypot */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.error && (
        <div role="alert" className="rounded-[8px] border border-earth bg-earth/5 p-4 text-sm text-earth">
          {t(`errors.${state.error}`)}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          <span>{t("firstName")} *</span>
          <input name="firstName" required maxLength={80} autoComplete="given-name" defaultValue={v.firstName} aria-invalid={bad("firstName")} className={input} />
        </label>
        <label className={label}>
          <span>{t("lastName")} *</span>
          <input name="lastName" required maxLength={80} autoComplete="family-name" defaultValue={v.lastName} aria-invalid={bad("lastName")} className={input} />
        </label>
        <label className={label}>
          <span>{t("email")} *</span>
          <input name="email" type="email" required maxLength={160} autoComplete="email" dir="ltr" defaultValue={v.email} aria-invalid={bad("email")} className={input} />
          <span className="text-xs text-muted">{t("emailHint")}</span>
        </label>
        <label className={label}>
          <span>{t("phone")} *</span>
          <input
            name="phone"
            type="tel"
            required
            minLength={6}
            maxLength={30}
            autoComplete="tel"
            dir="ltr"
            placeholder="+44 7700 900123"
            defaultValue={v.phone}
            aria-invalid={bad("phone")}
            className={input}
          />
          <span className="text-xs text-muted">{t("phoneHint")}</span>
        </label>
        <label className={label}>
          <span>{t("country")}</span>
          <input name="country" maxLength={60} autoComplete="country-name" defaultValue={v.country} className={input} />
        </label>
        <label className={label}>
          <span>{t("arrivalTime")}</span>
          <select name="arrivalTime" defaultValue={v.arrivalTime || "unknown"} className={input}>
            {ARRIVAL_TIMES.map((a) => (
              <option key={a} value={a}>
                {t(`arrival.${a}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={label}>
        <span>{t("requests")}</span>
        <textarea name="specialRequests" rows={4} maxLength={1000} defaultValue={v.specialRequests} placeholder={t("requestsHint")} className={cn(input, "resize-y")} />
      </label>

      <button type="submit" disabled={pending} className="btn-primary justify-center py-4 disabled:opacity-70">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
        {pending ? t("sending") : t("submit")}
      </button>
      <p className="text-center text-xs text-muted">{t("noPayment")}</p>
    </form>
  );
}
