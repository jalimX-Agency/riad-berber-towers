import type { BookingStatus } from "@prisma/client";
import { statusLabel, statusTone } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", statusTone[status], className)}>
      {statusLabel[status]}
    </span>
  );
}
