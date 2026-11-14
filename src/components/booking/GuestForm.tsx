"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, Pencil } from "lucide-react";
import { requestBooking, type BookState } from "@/app/[locale]/book/actions";
import { ARRIVAL_TIMES } from "@/lib/booking/arrival";
import { cn } from "@/lib/utils";

type Props = {
  room: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  /** pre-formatted on the server for the review step */
  summary: { room: string; dates: string; stay: string; total: string };
};

type Values = Record<"firstName" | "lastName" | "email" | "phone" | "country" | "arrivalTime" | "specialRequests", string>;
const empty: Values = { firstName: "", lastName: "", email: "", phone: "", country: "", arrivalTime: "unknown", specialRequests: "" };

const STEPS = ["details", "arrival", "review"] as const;
const DETAIL_FIELDS = ["firstName", "lastName", "email", "phone", "country"];

/** Three-step booking wizard. Every field stays mounted, so the final submit sends them all. */
export function GuestForm({ room, checkIn, checkOut, adults, summary }: Props) {
  const t = useTranslations("book");
  const locale = useLocale();
  const [state, action, pending] = useActionState<BookState, FormData>(requestBooking, {});
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(empty);
  const panel = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);

  // After a failed submit: restore what the guest typed and go back to the step with the problem
  useEffect(() => {
    if (!state.error) return;
    if (state.values) setValues({ ...empty, ...state.values } as Values);
    if (state.error === "invalid") setStep(state.fields?.some((f) => DETAIL_FIELDS.includes(f)) ? 0 : 1);
  }, [state]);

  useEffect(() => {
    top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    panel.current?.querySelector<HTMLElement>(`[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] button`)?.focus({ preventScroll: true });
  }, [step]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const bad = (f: string) => state.error === "invalid" && state.fields?.includes(f);

  /** Validate the current step with the browser's own rules before moving on. */
  function next() {
    const fields = panel.current?.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] textarea`);
    for (const f of fields ?? []) {
      if (!f.checkValidity()) {
        f.reportValidity();
        return;
      }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  const input =
    "w-full rounded-[8px] border border-rule bg-snow px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-earth aria-[invalid=true]:border-earth";
  const label = "grid gap-1.5 text-sm";

  const reviewRows: [string, string, number][] = [
    [t("room"), summary.room, -1],
    [t("dates"), summary.dates, -1],
    [t("stay"), summary.stay, -1],
    [t("guest"), `${values.firstName} ${values.lastName}`, 0],
    [t("email"), values.email, 0],
    [t("phone"), values.phone, 0],
    ...(values.country ? ([[t("country"), values.country, 0]] as [string, string, number][]) : []),
    [t("arrivalTime"), t(`arrival.${values.arrivalTime || "unknown"}`), 1],
    ...(values.specialRequests ? ([[t("requests"), values.specialRequests, 1]] as [string, string, number][]) : []),
  ];

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // Enter in a field before the last step means "next", not "book"
        if (step < STEPS.length - 1) {
          e.preventDefault();
          next();
        }
      }}
      className="grid gap-6"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="room" value={room} />
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />
      <input type="hidden" name="adults" value={adults} />
      {/* honeypot: hidden from people and screen readers */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* Stepper */}
      <div ref={top} className="scroll-mt-28">
        <ol className="grid grid-cols-3 gap-2" aria-label={t("steps")}>
          {STEPS.map((s, i) => (
            <li key={s} className="grid gap-2">
              <span className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-earth" : "bg-rule")} aria-hidden="true" />
              <button
                type="button"
                disabled={i > step}
                onClick={() => i < step && setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn("flex items-center gap-2 text-start text-sm disabled:cursor-default", i === step ? "font-medium text-ink" : i < step ? "text-earth" : "text-muted")}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs",
                    i < step ? "border-earth bg-earth text-snow" : i === step ? "border-ink" : "border-rule",
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{t(`step.${s}`)}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted sm:hidden">
          {t("stepOf", { current: step + 1, total: STEPS.length })} · {t(`step.${STEPS[step]}`)}
        </p>
      </div>

      {state.error && state.error !== "invalid" && (
        <div role="alert" className="rounded-[8px] border border-earth bg-earth/5 p-4 text-sm text-earth">
          {t(`errors.${state.error}`)}
        </div>
      )}
      {state.error === "invalid" && (
        <div role="alert" className="rounded-[8px] border border-earth bg-earth/5 p-4 text-sm text-earth">
          {t("errors.invalid")}
        </div>
      )}

      <div ref={panel}>
        {/* Step 1: who is coming */}
        <fieldset data-step={0} hidden={step !== 0} className="grid gap-5">
          <legend className="mb-4 text-2xl">{t("step.details")}</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={label}>
              <span>{t("firstName")} *</span>
              <input name="firstName" required maxLength={80} autoComplete="given-name" value={values.firstName} onChange={set("firstName")} aria-invalid={bad("firstName")} className={input} />
            </label>
            <label className={label}>
              <span>{t("lastName")} *</span>
              <input name="lastName" required maxLength={80} autoComplete="family-name" value={values.lastName} onChange={set("lastName")} aria-invalid={bad("lastName")} className={input} />
            </label>
            <label className={label}>
              <span>{t("email")} *</span>
              <input name="email" type="email" required maxLength={160} autoComplete="email" dir="ltr" value={values.email} onChange={set("email")} aria-invalid={bad("email")} className={input} />
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
                pattern="[+0-9 ().\-]{6,30}"
                autoComplete="tel"
                dir="ltr"
                placeholder="+44 7700 900123"
                value={values.phone}
                onChange={set("phone")}
                aria-invalid={bad("phone")}
                className={input}
              />
              <span className="text-xs text-muted">{t("phoneHint")}</span>
            </label>
            <label className={cn(label, "sm:col-span-2")}>
              <span>{t("country")}</span>
              <input name="country" maxLength={60} autoComplete="country-name" value={values.country} onChange={set("country")} className={input} />
            </label>
          </div>
        </fieldset>

        {/* Step 2: arrival */}
        <fieldset data-step={1} hidden={step !== 1} className="grid gap-5">
          <legend className="mb-4 text-2xl">{t("step.arrival")}</legend>
          <label className={label}>
            <span>{t("arrivalTime")}</span>
            <select name="arrivalTime" value={values.arrivalTime} onChange={set("arrivalTime")} className={input}>
              {ARRIVAL_TIMES.map((a) => (
                <option key={a} value={a}>
                  {t(`arrival.${a}`)}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">{t("arrivalHint")}</span>
          </label>
          <label className={label}>
            <span>{t("requests")}</span>
            <textarea
              name="specialRequests"
              rows={5}
              maxLength={1000}
              value={values.specialRequests}
              onChange={set("specialRequests")}
              placeholder={t("requestsHint")}
              aria-invalid={bad("specialRequests")}
              className={cn(input, "resize-y")}
            />
          </label>
        </fieldset>

        {/* Step 3: review and send */}
        <fieldset data-step={2} hidden={step !== 2} className="grid gap-5">
          <legend className="mb-4 text-2xl">{t("step.review")}</legend>
          <dl className="grid border-t border-rule text-sm">
            {reviewRows.map(([k, v, editStep]) => (
              <div key={k} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-start gap-3 border-b border-rule py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="whitespace-pre-line break-words font-medium" dir="auto">
                  {v}
                </dd>
                {editStep >= 0 ? (
                  <button type="button" onClick={() => setStep(editStep)} className="text-earth" aria-label={`${t("edit")}: ${k}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </dl>
          <div className="flex items-baseline justify-between rounded-[8px] bg-snow px-4 py-3">
            <span className="font-medium">{t("total")}</span>
            <span className="font-display text-3xl font-semibold" dir="ltr">
              {summary.total}
            </span>
          </div>
          <p className="text-sm text-muted">{t("reviewNote")}</p>
        </fieldset>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-outline">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {t("back")}
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className="btn-primary">
            {t("continue")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        ) : (
          <button type="submit" disabled={pending} className="btn-primary px-8 disabled:opacity-70">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
            {pending ? t("sending") : t("submit")}
          </button>
        )}
      </div>
      <p className="text-center text-xs text-muted">{t("noPayment")}</p>
    </form>
  );
}
