"use client";

import { useLinkStatus } from "next/link";
import { Bone } from "@/components/admin/Skeleton";

/**
 * Page skeleton shown over the main area while a sidebar link is loading.
 * The admin has no loading.tsx: with Next 15.5 a loading boundary blocked same-page navigations
 * (?view=, ?month=, ?b=) and server-action redirects to the same page in production.
 */
export function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span aria-hidden="true" className="pointer-events-none fixed inset-0 top-[56px] z-40 block bg-paper px-4 py-6 sm:px-6 lg:start-64 lg:top-0 lg:px-10 lg:py-10">
      <span className="grid gap-6">
        <span className="grid gap-2">
          <Bone className="h-3 w-28" />
          <Bone className="h-9 w-64" />
        </span>
        <span className="flex gap-2">
          <Bone className="h-8 w-40 rounded-full" />
          <Bone className="h-8 w-24 rounded-full" />
        </span>
        <span className="grid divide-y divide-rule overflow-hidden rounded-[10px] border border-rule bg-snow">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="flex items-center justify-between gap-4 p-4">
              <span className="grid gap-1.5">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-24" />
              </span>
              <Bone className="h-6 w-24 rounded-full" />
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
