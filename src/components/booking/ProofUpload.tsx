"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileUp, Loader2 } from "lucide-react";
import { MAX_PROOF_BYTES } from "@/lib/booking/policy";

type UploadError = "missing" | "too_big" | "type" | "too_many" | "closed" | "server";

/**
 * Proofs are kept in the database (free Neon plan: 0.5 GB), so photos are shrunk in the browser before sending:
 * at most 1,800 px on the long side, JPEG quality 0.8 (a 4 MB phone photo becomes about 300 KB, still easy to read).
 * PDFs, and images the browser can't decode (HEIC outside Safari), are sent as they are.
 */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 400_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // transparent PNG screenshots stay readable as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

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
    setSending(true);
    try {
      const small = await shrink(file);
      if (small.size > MAX_PROOF_BYTES) return setError("too_big");
      const body = new FormData();
      body.set("token", token);
      body.set("file", small);
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
