import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getSession();
  const [rooms, pending] = await Promise.all([
    db.room.count(),
    db.booking.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 grid gap-6">
      <p className="label">Tableau de bord</p>
      <h1 className="text-4xl">Bonjour {session?.user?.name || session?.user?.email}</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-[--radius-card] border border-rule bg-paper p-5">
          <p className="label">Chambres</p>
          <p className="font-display text-4xl">{rooms}</p>
        </div>
        <div className="rounded-[--radius-card] border border-rule bg-paper p-5">
          <p className="label">Réservations en attente</p>
          <p className="font-display text-4xl">{pending}</p>
        </div>
      </div>
    </main>
  );
}
