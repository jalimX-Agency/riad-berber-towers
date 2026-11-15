"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileUp, Loader2 } from "lucide-react";
import { MAX_PROOF_BYTES } from "@/lib/booking/policy";

type UploadError = "missing" | "too_big" | "type" | "too_many" | "closed" | "server";

/** Upload a screenshot or PDF of the deposit payment. The page then shows "payment being checked". */
export function ProofUpload({ token }: { token: string }) {
  const t = useTranslations("pay");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("missing");
    if (file.size > MAX_PROOF_BYTES) return setError("too_big");
    setSending(true);
    try {
      const body = new FormData();
      body.set("token", token);
      body.set("file", file);
      const res = await fetch("/api/booking/proof", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((["missing", "too_big", "type", "too_many", "closed"] as UploadError[]).includes(data.error) ? data.error : "server");
        return;
      }
      setFile(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setError("server");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={send} className="grid gap-3">
      <label className="grid cursor-pointer justify-items-center gap-2 rounded-[10px] border border-dashed border-earth/60 bg-snow px-4 py-6 text-center hover:bg-earth/5">
        <FileUp className="h-6 w-6 text-earth" aria-hidden="true" />
        <span className="text-sm font-medium">{file ? file.name : t("choose")}</span>
        <span className="text-xs text-muted">{t("formats", { mb: MAX_PROOF_BYTES / 1024 / 1024 })}</span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="sr-only"
          onChange={(e) => {
            setError(null);
            setFile(e.target.files?.[0] ?? null);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-earth">
          {t(`errors.${error}`)}
        </p>
      )}
      <button type="submit" disabled={sending || !file} className="btn-primary justify-center disabled:opacity-60">
        {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {sending ? t("sending") : t("send")}
      </button>
    </form>
  );
}
