import { db } from "@/lib/db";
import { groupGuestSelect, groupKey } from "@/lib/booking/group";
import { requireUser } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { Toaster } from "@/components/admin/Toaster";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // one count per reservation: several rooms booked together (same guest, same dates) are one request
  const open = await db.booking.findMany({
    where: { status: { in: ["PENDING", "PAYMENT_REVIEW"] } },
    select: { id: true, reference: true, checkIn: true, checkOut: true, guest: { select: groupGuestSelect } },
  });
  const pending = new Set(open.map(groupKey)).size;
  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <AdminNav user={user.email} pending={pending} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      <Toaster />
    </div>
  );
}
