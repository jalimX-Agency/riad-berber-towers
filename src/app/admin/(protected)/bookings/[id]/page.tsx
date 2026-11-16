import { db } from "@/lib/db";
import { BookingDetail } from "@/components/admin/BookingDetail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const b = await db.booking.findUnique({ where: { id }, select: { reference: true } });
  return { title: b?.reference ?? "Réservation" };
}

/** Full page: a shared link, a reload, or "Pleine page" from the side panel. */
export default async function BookingPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return (
    <div className="max-w-3xl">
      <BookingDetail id={id} sp={sp} mode="page" />
    </div>
  );
}
