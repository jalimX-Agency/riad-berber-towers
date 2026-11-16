"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger = red confirm button (delete, cancel a stay…) */
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The admin's confirmation dialog (instead of the browser's confirm / prompt).
 * Focus starts on "cancel" so Enter never confirms by accident; Escape or a click outside cancels.
 */
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel = "Annuler", tone = "danger", busy, onConfirm, onCancel }: Props) {
  const cancel = useRef<HTMLButtonElement>(null);
  const before = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    before.current = document.activeElement;
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      (before.current as HTMLElement | null)?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <button type="button" aria-label={cancelLabel} tabIndex={-1} onClick={() => !busy && onCancel()} className="absolute inset-0 bg-ink/50 backdrop-blur-[1px] motion-safe:animate-[fade-in_.15s_ease-out]" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={body ? "confirm-body" : undefined}
        className="relative grid w-full max-w-md gap-4 rounded-[14px] border border-rule bg-snow p-6 text-ink shadow-[0_30px_70px_-25px_rgba(47,32,22,0.6)] motion-safe:animate-[dialog-in_.18s_cubic-bezier(.2,.7,.2,1)]"
      >
        <div className="flex items-start gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", tone === "danger" ? "bg-rose-100 text-rose-700" : "bg-earth/10 text-earth")}>
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="grid gap-1.5">
            <h2 id="confirm-title" className="text-lg font-medium leading-snug">
              {title}
            </h2>
            {body && (
              <div id="confirm-body" className="text-sm text-muted">
                {body}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button ref={cancel} type="button" disabled={busy} onClick={onCancel} className="rounded-full border border-rule px-5 py-2 text-sm hover:border-ink disabled:opacity-50">
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-snow disabled:opacity-70",
              tone === "danger" ? "bg-rose-700 hover:bg-rose-800" : "bg-ink hover:bg-earth",
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
