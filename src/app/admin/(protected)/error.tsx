"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

/** Any admin page that fails (stale item, database hiccup…) shows this instead of a raw crash. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="grid max-w-xl gap-4 rounded-[10px] border border-rose-300 bg-rose-50 p-6 text-rose-950">
      <p className="flex items-center gap-2 text-lg font-medium">
        <TriangleAlert className="h-5 w-5" aria-hidden="true" />
        Une erreur est survenue
      </p>
      <p className="text-sm">
        L’action n’a pas pu aboutir. L’élément a peut-être déjà été modifié ou supprimé (dans un autre onglet, par un double clic…), ou la connexion a été interrompue.
      </p>
      {error.digest && <p className="font-mono text-xs opacity-70">Code : {error.digest}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-ink px-5 py-2 text-sm text-snow hover:bg-earth">
          Réessayer
        </button>
        <Link href="/admin" className="rounded-full border border-ink px-5 py-2 text-sm hover:border-earth hover:text-earth">
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
