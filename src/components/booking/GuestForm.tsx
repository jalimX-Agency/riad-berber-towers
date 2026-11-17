"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  Loader2,
  Lock,
  Minus,
  Mountain,
  Pencil,
  Plus, UtensilsCrossed,
} from "lucide-react";
import { requestBooking, type BookState } from "@/app/[locale]/book/actions";
import { ARRIVAL_TIMES } from "@/lib/booking/arrival";
import { cn } from "@/lib/utils";
import {
  BED_SETUPS,
  DEPOSIT_PERCENT,
  splitPayment,
} from "@/lib/booking/policy";
import { DINNER_PRICE, MAX_EXTRA_PEOPLE, TRANSFER_PICKUPS, TRANSFER_PRICE, type TransferPickup } from "@/lib/booking/extras";
import { setExtrasTotal } from "./extras-total";

export type ExtraOption = {
  slug: string;
  price: number;
  name: string;
  line: string;
  photo: string;
};

/** One wide bed, or two narrow ones. */
function BedIcon({ twin }: { twin: boolean }) {
  return (
    <svg
      viewBox="0 0 40 24"
      className="h-7 w-12 shrink-0 text-earth"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      {twin ? (
        <>
          <rect x="2" y="6" width="15" height="14" rx="2" />
          <rect x="4.5" y="8.5" width="10" height="4" rx="1" />
          <rect x="23" y="6" width="15" height="14" rx="2" />
          <rect x="25.5" y="8.5" width="10" height="4" rx="1" />
        </>
      ) : (
        <>
          <rect x="4" y="6" width="32" height="14" rx="2" />
          <rect x="7" y="8.5" width="11" height="4" rx="1" />
          <rect x="22" y="8.5" width="11" height="4" rx="1" />
        </>
      )}
    </svg>
  );
}

type Props = {
  room: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  /** nights of the stay: most evenings dinner can be booked for */
  nights: number;
  currency: string;
  /** room price for the stay; activities are added to it */
  roomTotal: number;
  extras: ExtraOption[];
  /** pre-formatted on the server for the review step */
  summary: {
    room: string;
    dates: string;
    stay: string;
    total: string;
    deposit: string;
    balance: string;
  };
};

type Values = Record<
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "country"
  | "arrivalTime"
  | "bedSetup"
  | "specialRequests",
  string
>;
const empty: Values = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  arrivalTime: "unknown",
  bedSetup: "DOUBLE",
  specialRequests: "",
};

const STEPS = ["details", "arrival", "extras", "review"] as const;
const DETAIL_FIELDS = ["firstName", "lastName", "email", "phone", "country"];

/** Three-step booking wizard. Every field stays mounted, so the final submit sends them all. */
export function GuestForm({
  room,
  checkIn,
  checkOut,
  adults,
  nights,
  currency,
  roomTotal,
  extras,
  summary,
}: Props) {
  const t = useTranslations("book");
  const locale = useLocale();
  const [state, action, pending] = useActionState<BookState, FormData>(
    requestBooking,
    {},
  );
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(empty);
  // activities: slug -> people (absent = not added); transfer from Marrakech
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [showActivities, setShowActivities] = useState(false);
  const [transfer, setTransfer] = useState<{
    on: boolean;
    from: TransferPickup;
    details: string;
  }>({ on: false, from: "airport", details: "" });
  // dinner at the riad: people and evenings
  const [dinner, setDinner] = useState<{ on: boolean; people: number; evenings: number }>({ on: false, people: Math.min(adults, MAX_EXTRA_PEOPLE), evenings: 1 });
  const dinnerSum = dinner.on ? DINNER_PRICE * dinner.people * dinner.evenings : 0;
  const money = (n: number) =>
    new Intl.NumberFormat(locale === "ar" ? "en" : locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  const chosen = extras.filter((x) => picks[x.slug] > 0);
  const extrasSum = chosen.reduce((sum, x) => sum + x.price * picks[x.slug], 0) + (transfer.on ? TRANSFER_PRICE : 0) + dinnerSum;
  // keep the stay summary beside the form in step with the choices
  useEffect(() => setExtrasTotal(extrasSum), [extrasSum]);
  useEffect(() => () => setExtrasTotal(0), []);
  const split = splitPayment(roomTotal + extrasSum);
  const togglePick = (slug: string) =>
    setPicks((p) =>
      p[slug]
        ? Object.fromEntries(Object.entries(p).filter(([k]) => k !== slug))
        : { ...p, [slug]: Math.min(adults, MAX_EXTRA_PEOPLE) },
    );
  const people = (slug: string, d: number) =>
    setPicks((p) => ({
      ...p,
      [slug]: Math.min(MAX_EXTRA_PEOPLE, Math.max(1, (p[slug] ?? 1) + d)),
    }));
  const panel = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);

  // After a failed submit: restore what the guest typed and go back to the step with the problem
  useEffect(() => {
    if (!state.error) return;
    if (state.values) setValues({ ...empty, ...state.values } as Values);
    if (state.error === "invalid")
      setStep(state.fields?.some((f) => DETAIL_FIELDS.includes(f)) ? 0 : 1);
  }, [state]);

  useEffect(() => {
    top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    panel.current
      ?.querySelector<HTMLElement>(
        `[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] button`,
      )
      ?.focus({ preventScroll: true });
  }, [step]);

  const set =
    (k: keyof Values) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setValues((v) => ({ ...v, [k]: e.target.value }));
  const bad = (f: string) =>
    state.error === "invalid" && state.fields?.includes(f);

  /** Validate the current step with the browser's own rules before moving on. */
  function next() {
    const fields = panel.current?.querySelectorAll<HTMLInputElement>(
      `[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] textarea`,
    );
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
    ...(values.country
      ? ([[t("country"), values.country, 0]] as [string, string, number][])
      : []),
    [t("bed"), t(`beds.${values.bedSetup === "TWIN" ? "TWIN" : "DOUBLE"}`), 1],
    [t("arrivalTime"), t(`arrival.${values.arrivalTime || "unknown"}`), 1],
    ...(values.specialRequests
      ? ([[t("requests"), values.specialRequests, 1]] as [
          string,
          string,
          number,
        ][])
      : []),
    [
      t("extras.title"),
      chosen.length
        ? chosen
            .map(
              (x) =>
                `${x.name} · ${t("extras.people", { count: picks[x.slug] })} · ${money(x.price * picks[x.slug])}`,
            )
            .join("\n")
        : t("extras.none"),
      2,
    ],
    ...(dinner.on
      ? ([[t("dinner.title"), `${t("extras.people", { count: dinner.people })} × ${t("dinner.evenings", { count: dinner.evenings })}\n${money(dinnerSum)}`, 2]] as [string, string, number][])
      : []),
    ...(transfer.on
      ? ([
          [
            t("transfer.title"),
            `${t(`transfer.pickups.${transfer.from}`)}${transfer.details ? ` · ${transfer.details}` : ""}\n${money(TRANSFER_PRICE)}`,
            2,
          ],
        ] as [string, string, number][])
      : []),
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
      {dinner.on && (
        <>
          <input type="hidden" name="dinnerPeople" value={dinner.people} />
          <input type="hidden" name="dinnerEvenings" value={dinner.evenings} />
        </>
      )}
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />
      <input type="hidden" name="adults" value={adults} />
      {chosen.map((x) => (
        <input
          key={x.slug}
          type="hidden"
          name={`extra_${x.slug}`}
          value={picks[x.slug]}
        />
      ))}
      {/* honeypot: hidden from people and screen readers */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* Stepper */}
      <div ref={top} className="scroll-mt-28">
        <ol className="grid grid-cols-4 gap-2" aria-label={t("steps")}>
          {STEPS.map((s, i) => (
            <li key={s} className="grid gap-2">
              <span
                className={cn(
                  "h-1 rounded-full transition-colors",
                  i <= step ? "bg-earth" : "bg-rule",
                )}
                aria-hidden="true"
              />
              <button
                type="button"
                disabled={i > step}
                onClick={() => i < step && setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-start text-sm disabled:cursor-default",
                  i === step
                    ? "font-medium text-ink"
                    : i < step
                      ? "text-earth"
                      : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs",
                    i < step
                      ? "border-earth bg-earth text-snow"
                      : i === step
                        ? "border-ink"
                        : "border-rule",
                  )}
                >
                  {i < step ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="hidden sm:inline">{t(`step.${s}`)}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted sm:hidden">
          {t("stepOf", { current: step + 1, total: STEPS.length })} ·{" "}
          {t(`step.${STEPS[step]}`)}
        </p>
      </div>

      {state.error && state.error !== "invalid" && (
        <div
          role="alert"
          className="rounded-[8px] border border-earth bg-earth/5 p-4 text-sm text-earth"
        >
          {t(`errors.${state.error}`)}
        </div>
      )}
      {state.error === "invalid" && (
        <div
          role="alert"
          className="rounded-[8px] border border-earth bg-earth/5 p-4 text-sm text-earth"
        >
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
              <input
                name="firstName"
                required
                maxLength={80}
                autoComplete="given-name"
                value={values.firstName}
                onChange={set("firstName")}
                aria-invalid={bad("firstName")}
                className={input}
              />
            </label>
            <label className={label}>
              <span>{t("lastName")} *</span>
              <input
                name="lastName"
                required
                maxLength={80}
                autoComplete="family-name"
                value={values.lastName}
                onChange={set("lastName")}
                aria-invalid={bad("lastName")}
                className={input}
              />
            </label>
            <label className={label}>
              <span>{t("email")} *</span>
              <input
                name="email"
                type="email"
                required
                maxLength={160}
                autoComplete="email"
                dir="ltr"
                value={values.email}
                onChange={set("email")}
                aria-invalid={bad("email")}
                className={input}
              />
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
              <input
                name="country"
                maxLength={60}
                autoComplete="country-name"
                value={values.country}
                onChange={set("country")}
                className={input}
              />
            </label>
          </div>
        </fieldset>

        {/* Step 2: arrival */}
        <fieldset data-step={1} hidden={step !== 1} className="grid gap-5">
          <legend className="mb-4 text-2xl">{t("step.arrival")}</legend>
          {/* beds: every room can be set up either way */}
          <div role="radiogroup" aria-label={t("bed")} className="grid gap-2">
            <span className="text-sm">{t("bed")}</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {BED_SETUPS.map((b) => (
                <label
                  key={b}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[10px] border bg-snow p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-earth/40",
                    values.bedSetup === b
                      ? "border-earth ring-1 ring-earth"
                      : "border-rule hover:border-earth/60",
                  )}
                >
                  <input
                    type="radio"
                    name="bedSetup"
                    value={b}
                    checked={values.bedSetup === b}
                    onChange={set("bedSetup")}
                    className="sr-only"
                  />
                  <BedIcon twin={b === "TWIN"} />
                  <span className="grid">
                    <span className="font-medium">{t(`beds.${b}`)}</span>
                  </span>
                  {values.bedSetup === b && (
                    <Check
                      className="ms-auto h-4 w-4 text-earth"
                      aria-hidden="true"
                    />
                  )}
                </label>
              ))}
            </div>
            <span className="text-xs text-muted">{t("bedHint")}</span>
          </div>
          <label className={label}>
            <span>{t("arrivalTime")}</span>
            <select
              name="arrivalTime"
              value={values.arrivalTime}
              onChange={set("arrivalTime")}
              className={input}
            >
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

        {/* Step 3: activities and transfer (optional) */}
        <fieldset data-step={2} hidden={step !== 2} className="grid gap-5">
          <legend className="mb-1 text-2xl">{t("step.extras")}</legend>
          {/* activities: one option; the list opens when it is chosen */}
          <div
            className={cn(
              "grid gap-4 rounded-[10px] border bg-snow p-4",
              showActivities ? "border-earth ring-1 ring-earth" : "border-rule",
            )}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={showActivities}
                onChange={(e) => {
                  setShowActivities(e.target.checked);
                  if (!e.target.checked) setPicks({});
                }}
                className="mt-1 h-4 w-4 accent-[var(--earth)]"
              />
              <span className="grid gap-0.5">
                <span className="flex items-center gap-2 font-medium">
                  <Mountain className="h-4 w-4 text-earth" aria-hidden="true" />
                  {t("extras.option")}
                </span>
                <span className="text-sm text-muted">{t("extras.intro")}</span>
              </span>
            </label>
            {showActivities && (
              <ul className="grid gap-3">
                {extras.map((x) => {
                  const n = picks[x.slug] ?? 0;
                  return (
                    <li
                      key={x.slug}
                      className={cn(
                        "grid grid-cols-[64px_1fr] gap-3 rounded-[10px] border bg-snow p-3 transition-colors sm:grid-cols-[80px_1fr_auto] sm:items-center",
                        n ? "border-earth ring-1 ring-earth" : "border-rule",
                      )}
                    >
                      <div className="relative row-span-2 aspect-square overflow-hidden rounded-[8px] sm:row-span-1">
                        <Image
                          src={x.photo}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="grid gap-0.5">
                        <span className="font-medium leading-snug">
                          {x.name}
                        </span>
                        <span className="text-xs text-muted">{x.line}</span>
                        <span className="text-sm">
                          <span className="font-medium" dir="ltr">
                            {money(x.price)}
                          </span>{" "}
                          <span className="text-muted">
                            {t("extras.perPerson")}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {n > 0 && (
                          <div
                            className="flex items-center rounded-full border border-rule"
                            role="group"
                            aria-label={t("extras.peopleLabel", {
                              name: x.name,
                            })}
                          >
                            <button
                              type="button"
                              onClick={() => people(x.slug, -1)}
                              disabled={n <= 1}
                              className="grid h-9 w-9 place-items-center disabled:opacity-40"
                              aria-label={t("extras.less")}
                            >
                              <Minus
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                            <span
                              className="min-w-[4.5rem] text-center text-sm"
                              aria-live="polite"
                            >
                              {t("extras.people", { count: n })}
                            </span>
                            <button
                              type="button"
                              onClick={() => people(x.slug, 1)}
                              disabled={n >= MAX_EXTRA_PEOPLE}
                              className="grid h-9 w-9 place-items-center disabled:opacity-40"
                              aria-label={t("extras.more")}
                            >
                              <Plus
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => togglePick(x.slug)}
                          aria-pressed={n > 0}
                          className={cn(
                            "rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.12em]",
                            n
                              ? "border border-earth text-earth"
                              : "bg-ink text-snow hover:bg-earth",
                          )}
                        >
                          {n ? t("extras.remove") : t("extras.add")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* dinner at the riad (restaurant set menu) */}
          <div className={cn("grid gap-4 rounded-[10px] border bg-snow p-4", dinner.on ? "border-earth ring-1 ring-earth" : "border-rule")}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={dinner.on} onChange={(e) => setDinner((d) => ({ ...d, on: e.target.checked }))} className="mt-1 h-4 w-4 accent-[var(--earth)]" />
              <span className="grid gap-0.5">
                <span className="flex items-center gap-2 font-medium">
                  <UtensilsCrossed className="h-4 w-4 text-earth" aria-hidden="true" />
                  {t("dinner.title")}
                </span>
                <span className="text-sm text-muted">{t("dinner.text")}</span>
                <span className="text-sm">
                  <span className="font-medium" dir="ltr">{money(DINNER_PRICE)}</span> <span className="text-muted">{t("dinner.per")}</span>
                </span>
              </span>
            </label>
            {dinner.on && (
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ["people", t("dinner.peopleLabel"), MAX_EXTRA_PEOPLE, (n: number) => t("extras.people", { count: n })],
                  ["evenings", t("dinner.eveningsLabel"), Math.max(1, nights), (n: number) => t("dinner.evenings", { count: n })],
                ] as const).map(([key, lab, max, fmt]) => (
                  <div key={key} className="grid gap-1.5 text-sm">
                    <span>{lab}</span>
                    <div className="flex w-fit items-center rounded-full border border-rule" role="group" aria-label={lab}>
                      <button type="button" onClick={() => setDinner((d) => ({ ...d, [key]: Math.max(1, d[key] - 1) }))} disabled={dinner[key] <= 1} className="grid h-9 w-9 place-items-center disabled:opacity-40" aria-label={t("extras.less")}>
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="min-w-[6rem] text-center" aria-live="polite">{fmt(dinner[key])}</span>
                      <button type="button" onClick={() => setDinner((d) => ({ ...d, [key]: Math.min(max, d[key] + 1) }))} disabled={dinner[key] >= max} className="grid h-9 w-9 place-items-center disabled:opacity-40" aria-label={t("extras.more")}>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted sm:col-span-2">{t("dinner.note")}</p>
              </div>
            )}
          </div>

          <div
            className={cn(
              "grid gap-4 rounded-[10px] border bg-snow p-4",
              transfer.on ? "border-earth ring-1 ring-earth" : "border-rule",
            )}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="transfer"
                value="1"
                checked={transfer.on}
                onChange={(e) =>
                  setTransfer((v) => ({ ...v, on: e.target.checked }))
                }
                className="mt-1 h-4 w-4 accent-[var(--earth)]"
              />
              <span className="grid gap-0.5">
                <span className="flex items-center gap-2 font-medium">
                  <Car className="h-4 w-4 text-earth" aria-hidden="true" />
                  {t("transfer.title")}
                </span>
                <span className="text-sm text-muted">{t("transfer.text")}</span>
                <span className="text-sm">
                  <span className="font-medium" dir="ltr">{money(TRANSFER_PRICE)}</span>{" "}
                  <span className="text-muted">{t("transfer.price")}</span>
                </span>
              </span>
            </label>
            {transfer.on && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  <span>{t("transfer.from")}</span>
                  <select
                    name="transferFrom"
                    value={transfer.from}
                    onChange={(e) =>
                      setTransfer((v) => ({
                        ...v,
                        from: e.target.value as TransferPickup,
                      }))
                    }
                    className={input}
                  >
                    {TRANSFER_PICKUPS.map((p) => (
                      <option key={p} value={p}>
                        {t(`transfer.pickups.${p}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  <span>{t("transfer.details")}</span>
                  <input
                    name="transferDetails"
                    maxLength={200}
                    value={transfer.details}
                    onChange={(e) =>
                      setTransfer((v) => ({ ...v, details: e.target.value }))
                    }
                    placeholder={t("transfer.detailsHint")}
                    className={input}
                  />
                </label>
                <p className="text-xs text-muted sm:col-span-2">
                  {t("transfer.otherCity")}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-baseline justify-between rounded-[8px] bg-snow px-4 py-3" aria-live="polite">
            <span className="font-medium">{t("total")}</span>
            <span className="font-display text-2xl font-semibold" dir="ltr">{money(roomTotal + extrasSum)}</span>
          </div>
        </fieldset>

        {/* Step 4: review and send */}
        <fieldset data-step={3} hidden={step !== 3} className="grid gap-5">
          <legend className="mb-4 text-2xl">{t("step.review")}</legend>
          <dl className="grid border-t border-rule text-sm">
            {reviewRows.map(([k, v, editStep]) => (
              <div
                key={k}
                className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-start gap-3 border-b border-rule py-2.5"
              >
                <dt className="text-muted">{k}</dt>
                <dd
                  className="whitespace-pre-line break-words font-medium"
                  dir="auto"
                >
                  {v}
                </dd>
                {editStep >= 0 ? (
                  <button
                    type="button"
                    onClick={() => setStep(editStep)}
                    className="text-earth"
                    aria-label={`${t("edit")}: ${k}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </dl>
          {extrasSum > 0 && (
            <dl className="grid gap-1.5 px-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("roomTotal")}</dt>
                <dd dir="ltr">{summary.total}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("extrasSum")}</dt>
                <dd dir="ltr">{money(extrasSum)}</dd>
              </div>
            </dl>
          )}
          <div className="flex items-baseline justify-between rounded-[8px] bg-snow px-4 py-3">
            <span className="font-medium">{t("total")}</span>
            <span className="font-display text-3xl font-semibold" dir="ltr">
              {extrasSum > 0 ? money(roomTotal + extrasSum) : summary.total}
            </span>
          </div>
          <dl className="grid gap-1.5 px-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt>{t("deposit", { percent: DEPOSIT_PERCENT })}</dt>
              <dd className="font-medium" dir="ltr">
                {extrasSum > 0 ? money(split.deposit) : summary.deposit}
              </dd>
            </div>
            <div className="flex justify-between gap-3 text-muted">
              <dt>{t("balance")}</dt>
              <dd dir="ltr">
                {extrasSum > 0 ? money(split.balance) : summary.balance}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted">{t("reviewNote")}</p>
        </fieldset>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="btn-outline"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {t("back")}
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          // distinct keys: without them React reuses this <button> for "submit" during the last "continue"
          // click, and the browser then submits the form from that same click (booking sent without review)
          <button
            key="next"
            type="button"
            onClick={next}
            className="btn-primary"
          >
            {t("continue")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        ) : (
          <button
            key="submit"
            type="submit"
            disabled={pending}
            className="btn-primary px-8 disabled:opacity-70"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Lock className="h-4 w-4" aria-hidden="true" />
            )}
            {pending ? t("sending") : t("submit")}
          </button>
        )}
      </div>
      <p className="text-center text-xs text-muted">{t("noPayment")}</p>
    </form>
  );
}
