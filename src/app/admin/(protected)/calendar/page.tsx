import { canManage, requireUser } from "@/lib/admin/guard";
import { addDays, parseDay, todayInImlil, toISO } from "@/lib/booking/dates";
import { loadCalendar } from "@/lib/admin/control-calendar";
import { BookingPanelSlot, pageHref } from "@/components/admin/BookingPanelSlot";
import { ControlCalendar } from "@/components/admin/calendar/ControlCalendar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendrier" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

/**
 * The control centre: every booking from every platform, the three prices (site, Booking.com, Airbnb),
 * minimum stays and closures, for all rooms, on one screen. Owner and admins edit; staff read.
 */
export default async function CalendarPage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayInImlil();
  const view = sp.view === "14" ? 14 : 31;
  // a few days of history so yesterday's departures stay visible
  const start = parseDay(sp.start ?? "") ?? addDays(today, -2);
  const data = await loadCalendar(start, addDays(start, view));

  return (
    <>
      <ControlCalendar data={data} canEdit={canManage(user.role)} today={toISO(today)} view={view} pageUrl={pageHref("/admin/calendar", sp)} />
      <BookingPanelSlot basePath="/admin/calendar" sp={sp} />
    </>
  );
}
