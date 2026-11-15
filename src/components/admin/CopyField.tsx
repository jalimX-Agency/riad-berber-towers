"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value} onFocus={(e) => e.target.select()} dir="ltr" className="min-w-0 flex-1 rounded-[8px] border border-rule bg-paper px-3 py-2 font-mono text-xs" aria-label="Lien d’export" />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rule px-3 py-2 text-xs hover:border-earth"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}
