"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

/** One line of the bank details (label, value) with a copy button, so the guest pastes the IBAN without typos. */
export function CopyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const t = useTranslations("pay");
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule py-2.5 last:border-b-0">
      <div className="grid min-w-0 gap-0.5">
        <span className="text-xs text-muted">{label}</span>
        <span dir="ltr" className={`break-all text-start text-sm font-medium ${mono ? "font-mono tracking-wide" : ""}`}>
          {value}
        </span>
      </div>
      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(value).then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1800);
          })
        }
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-xs hover:border-earth"
      >
        {done ? <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        {done ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
