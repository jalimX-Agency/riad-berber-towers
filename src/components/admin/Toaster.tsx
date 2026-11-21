"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Admin notifications: every success or error message shows as a toast in the corner of the screen,
 * whatever page or panel it comes from. Client code calls toast(); server-rendered results (?done=…, ?error=…
 * after a form action) go through <Flash>, which shows them once and removes them from the address bar.
 */
export type ToastKind = "success" | "error" | "info";
type Item = { id: number; kind: ToastKind; text: string; detail?: string };

let nextId = 1;
const listeners = new Set<(t: Item) => void>();
/** toasts sent before <Toaster> is listening (a page's effects run before the layout's): shown as soon as it is */
const queue: Item[] = [];

export function toast(kind: ToastKind, text: string, detail?: string) {
  const item = { id: nextId++, kind, text, detail };
  if (!listeners.size) queue.push(item);
  listeners.forEach((l) => l(item));
}

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const add = (t: Item) => {
      setItems((cur) => [...cur.filter((x) => x.text !== t.text), t].slice(-4));
      window.setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), t.kind === "error" ? 9000 : 5000);
    };
    listeners.add(add);
    queue.splice(0).forEach(add);
    return () => {
      listeners.delete(add);
    };
  }, []);
  const close = (id: number) => setItems((cur) => cur.filter((x) => x.id !== id));

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-auto sm:end-5 sm:top-5 sm:items-end">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cn(
            "toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[12px] border bg-snow p-3.5 pe-2 text-sm shadow-xl",
            t.kind === "success" && "border-emerald-300",
            t.kind === "error" && "border-rose-300",
            t.kind === "info" && "border-rule",
          )}
        >
          <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", t.kind === "success" ? "bg-emerald-100 text-emerald-700" : t.kind === "error" ? "bg-rose-100 text-rose-700" : "bg-paper text-earth")}>
            {t.kind === "success" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : t.kind === "error" ? <TriangleAlert className="h-4 w-4" aria-hidden="true" /> : <Info className="h-4 w-4" aria-hidden="true" />}
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="text-ink">{t.text}</p>
            {t.detail && <p className="text-xs text-muted">{t.detail}</p>}
          </div>
          <button type="button" onClick={() => close(t.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink" aria-label="Fermer">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Show messages rendered by the server (result of a form action, read from the URL) as toasts, once,
 * then drop their parameters from the address bar so a reload doesn't show them again.
 */
export function Flash({ messages, params = ["done", "error", "email", "detail", "deleted", "created"] }: { messages: { kind: ToastKind; text: string; detail?: string }[]; params?: string[] }) {
  const shown = useRef("");
  const signature = messages.map((m) => m.text + (m.detail ?? "")).join("|");
  useEffect(() => {
    if (!messages.length || shown.current === signature) return;
    shown.current = signature;
    messages.forEach((m) => toast(m.kind, m.text, m.detail));
    try {
      const url = new URL(window.location.href);
      params.forEach((p) => url.searchParams.delete(p));
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return null;
}
