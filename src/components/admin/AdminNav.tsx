"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BedDouble, CalendarDays, ExternalLink, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Tags, X } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Réservations", icon: BedDouble },
  { href: "/admin/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/admin/rates", label: "Tarifs et fermetures", icon: Tags },
  { href: "/admin/channels", label: "Booking.com / Airbnb", icon: RefreshCw },
] as { href: string; label: string; icon: typeof BedDouble; exact?: boolean; soon?: boolean }[];

export function AdminNav({ user, pending }: { user: string; pending: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const links = (
    <nav className="grid gap-1" aria-label="Administration">
      {items.map(({ href, label, icon: Icon, exact, soon }) =>
        soon ? (
          <span key={href} className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm text-snow/40" title="Bientôt">
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            <span className="ms-auto text-[10px] uppercase tracking-wider">bientôt</span>
          </span>
        ) : (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active(href, exact) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm transition-colors",
              active(href, exact) ? "bg-snow/15 text-snow" : "text-snow/75 hover:bg-snow/10 hover:text-snow",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            {href === "/admin/bookings" && pending > 0 && (
              <span className="ms-auto rounded-full bg-amber-400 px-2 text-xs font-semibold text-ink">{pending}</span>
            )}
          </Link>
        ),
      )}
      <Link
        href="/admin/bookings/new"
        onClick={() => setOpen(false)}
        className="mt-3 flex items-center justify-center gap-2 rounded-full bg-earth px-3 py-2 text-sm text-snow hover:bg-earth/90"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nouvelle réservation
      </Link>
    </nav>
  );

  const footer = (
    <div className="grid gap-1 border-t border-snow/15 pt-3 text-sm">
      <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-snow/75 hover:bg-snow/10 hover:text-snow">
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        Voir le site
      </a>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-start text-snow/75 hover:bg-snow/10 hover:text-snow"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Se déconnecter
      </button>
      <p className="truncate px-3 pt-1 text-xs text-snow/50" title={user}>
        {user}
      </p>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5">
      <Image src="/brand/rbt-emblem-ivory.svg" alt="" width={28} height={31} />
      <span className="font-display text-lg leading-tight text-snow">
        Riad Berber Towers
        <span className="block font-sans text-[10px] uppercase tracking-[0.18em] text-snow/60">Administration</span>
      </span>
    </Link>
  );

  return (
    <>
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 bg-walnut p-4 lg:flex">
        {brand}
        <div className="flex-1">{links}</div>
        {footer}
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-walnut px-4 py-3 lg:hidden">
        {brand}
        <button type="button" onClick={() => setOpen(true)} className="text-snow" aria-label="Menu">
          <Menu className="h-6 w-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col gap-6 bg-walnut p-4 lg:hidden" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between">
            {brand}
            <button type="button" onClick={() => setOpen(false)} className="text-snow" aria-label="Fermer">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1">{links}</div>
          {footer}
        </div>
      )}
    </>
  );
}
