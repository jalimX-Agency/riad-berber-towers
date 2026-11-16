"use client";

import { useEffect, useRef } from "react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Bone } from "@/components/admin/Skeleton";

/** The sliding sheet itself (shared by the real panel and its loading skeleton). */
function Sheet({ onClose, children, label }: { onClose?: () => void; children: React.ReactNode; label: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Fermer" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[1px] motion-safe:animate-[fade-in_.2s_ease-out]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="relative h-dvh w-full max-w-3xl overflow-y-auto bg-paper px-5 pb-8 shadow-[-24px_0_60px_-30px_rgba(47,32,22,0.6)] outline-none sm:px-8 motion-safe:animate-[panel-in_.28s_cubic-bezier(.2,.7,.2,1)]"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A booking shown in a side panel over the page it was opened from (?b=<id> on that page).
 * Esc, a click outside or the close button go back to the same page without the panel.
 */
export function BookingPanel({ closeHref, children }: { closeHref: string; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeHref, router]);
  return (
    <Sheet label="Détails de la réservation" onClose={() => router.push(closeHref, { scroll: false })}>
      {children}
    </Sheet>
  );
}

export function PanelClose({ href }: { href: string }) {
  return (
    <Link href={href} scroll={false} prefetch={false} className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper" aria-label="Fermer">
      <X className="h-5 w-5" aria-hidden="true" />
    </Link>
  );
}

/** Skeleton of the panel, shown the moment a booking link is clicked (before the server answers). */
export function PanelSkeleton() {
  return (
    <Sheet label="Chargement de la réservation">
      <div role="status" aria-busy="true" className="grid gap-7 pt-5">
        <span className="sr-only">Chargement…</span>
        <div className="flex justify-between">
          <Bone className="h-5 w-32" />
          <Bone className="h-9 w-9 rounded-full" />
        </div>
        <div className="grid gap-3">
          <Bone className="h-6 w-40 rounded-full" />
          <Bone className="h-12 w-72" />
          <Bone className="h-4 w-80" />
          <div className="flex gap-2">
            <Bone className="h-9 w-28 rounded-full" />
            <Bone className="h-9 w-24 rounded-full" />
            <Bone className="h-9 w-20 rounded-full" />
          </div>
        </div>
        <Bone className="h-24 w-full rounded-[12px]" />
        <Bone className="h-36 w-full rounded-[12px]" />
        <Bone className="h-24 w-full rounded-[12px]" />
      </div>
    </Sheet>
  );
}

/** Put inside a <Link> that opens a booking: shows the panel skeleton while that navigation is pending. */
export function PendingPanel() {
  const { pending } = useLinkStatus();
  return pending ? <PanelSkeleton /> : null;
}
