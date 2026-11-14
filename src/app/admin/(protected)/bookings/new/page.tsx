import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/admin/guard";
import { todayInImlil, toISO } from "@/lib/booking/dates";
import { NewBookingForm } from "@/components/admin/NewBookingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouvelle réservation" };

export default async function NewBookingPage() {
  await requireUser();
  const rooms = await db.room.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { slug: true, name: true, maxAdults: true } });
  return (
    <div className="grid max-w-5xl gap-6">
      <Link href="/admin/bookings" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-earth">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Réservations
      </Link>
      <header className="grid gap-1">
        <h1 className="text-4xl">Nouvelle réservation</h1>
        <p className="text-muted">Pour une réservation prise par téléphone, WhatsApp, email ou une agence. Aucun email n’est envoyé au client.</p>
      </header>
      <NewBookingForm rooms={rooms} today={toISO(todayInImlil())} />
    </div>
  );
}
