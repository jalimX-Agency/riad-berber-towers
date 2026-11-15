import { cn } from "@/lib/utils";

/** Grey placeholder block with a soft pulse (respects reduced motion). */
export function Bone({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded-[6px] bg-rule/60 motion-reduce:animate-none", className)} />;
}

/** Screen-reader text + wrapper for every loading skeleton. */
export function SkeletonPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn("grid gap-6", className)}>
      <span className="sr-only">Chargement…</span>
      {children}
    </div>
  );
}

export function SkeletonHeader({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-2">
        <Bone className="h-3 w-28" />
        <Bone className="h-9 w-64" />
      </div>
      {action && <Bone className="h-10 w-44 rounded-full" />}
    </div>
  );
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("grid content-start gap-3 rounded-[10px] border border-rule bg-snow p-5", className)}>
      <Bone className="h-5 w-40" />
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Rows of a list/table (bookings, rates…). */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-rule overflow-hidden rounded-[10px] border border-rule bg-snow">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[1.4fr_1fr] items-center gap-4 p-4 md:grid-cols-[1.4fr_1fr_1.2fr_0.7fr_0.8fr]">
          <div className="grid gap-1.5">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-24" />
          </div>
          <Bone className="h-4 w-24 justify-self-end md:justify-self-auto" />
          <Bone className="hidden h-4 w-36 md:block" />
          <Bone className="hidden h-4 w-16 md:block" />
          <Bone className="hidden h-6 w-24 rounded-full md:block" />
        </div>
      ))}
    </div>
  );
}
