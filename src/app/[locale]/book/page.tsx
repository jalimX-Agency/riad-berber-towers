import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BedDouble, CalendarDays, Check, Coffee, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getRoom, formatPrice } from "@/lib/rooms";
import { getAvailability, parseStayQuery } from "@/lib/booking/availability";
import { toISO } from "@/lib/booking/dates";
import { formatStayDate } from "@/lib/email/booking";
import { GuestForm } from "@/components/booking/GuestForm";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "book" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function BookPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("book");
  const ts = await getTranslations("search");
  const tr = await getTranslations("rooms");
  const tres = await getTranslations("results");

  const slug = one(sp.room) ?? "";
  const room = slug ? await getRoom(locale, slug) : null;
  const { query, error } = parseStayQuery({ checkIn: one(sp.checkIn), checkOut: one(sp.checkOut), adults: one(sp.adults) });
  const a = room && query ? (await getAvailability(query, { roomId: room.id })).get(room.id) : undefined;
  const qs = query ? `?checkIn=${toISO(query.checkIn)}&checkOut=${toISO(query.checkOut)}&adults=${query.adults}` : "";

  // Anything wrong with the link: explain and send the guest back to the search
  if (!room || !query || !a || !a.available) {
    const message = !room
      ? t("errors.noRoom")
      : !query
        ? ts(`errors.${error === "missing" ? "missing" : error}`)
        : a?.reason
          ? tres(`reason.${a.reason}`, { max: room.maxAdults, count: a.minNights })
          : t("errors.unavailable");
    return (
      <section className="container-site grid max-w-2xl gap-5 py-20 text-center">
        <h1 className="text-4xl">{t("title")}</h1>
        <p className="text-muted">{message}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/rooms${qs}`} className="btn-primary">
            {t("seeOtherRooms")}
          </Link>
          {room && (
            <Link href={`/rooms/${room.slug}${qs}`} className="btn-outline">
              {tres("changeDates")}
            </Link>
          )}
        </div>
      </section>
    );
  }

  const fmt = (n: number) => formatPrice(n, room.currency, locale);

  return (
    <div className="container-site grid gap-8 pb-24 pt-8 md:pt-12">
      <nav aria-label="Breadcrumb" className="meta flex flex-wrap items-center gap-2 text-muted">
        <Link href={`/rooms${qs}`} className="hover:text-earth">
          {tr("title")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/rooms/${room.slug}${qs}`} className="hover:text-earth">
          {room.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-ink">
          {t("title")}
        </span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section className="grid gap-6">
          <div className="grid gap-2">
            <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
            <p className="max-w-[60ch] text-muted">{t("intro")}</p>
          </div>
          <div className="rounded-[10px] border border-rule bg-paper p-5 sm:p-6">
            <GuestForm
              room={room.slug}
              checkIn={toISO(query.checkIn)}
              checkOut={toISO(query.checkOut)}
              adults={query.adults}
              summary={{
                room: room.name,
                dates: `${formatStayDate(query.checkIn, locale)} → ${formatStayDate(query.checkOut, locale)}`,
                stay: `${ts("nights", { count: query.nights })}, ${ts("adults", { count: query.adults })}`,
                total: fmt(a.total),
              }}
            />
          </div>
        </section>

        {/* Stay summary */}
        <aside className="order-first grid gap-0 overflow-hidden rounded-[10px] border border-rule bg-snow lg:sticky lg:top-28 lg:order-none">
          <div className="relative aspect-[16/9] bg-walnut">
            {room.cover && <Image src={room.cover} alt={room.name} fill sizes="380px" className="object-cover" priority />}
          </div>
          <div className="grid gap-4 p-5">
            <div>
              <p className="label">
                {tr(`category.${room.category}`)} · {tr(`floor.${room.floor}`)}
              </p>
              <h2 className="text-2xl">{room.name}</h2>
            </div>
            <ul className="grid gap-2 text-sm">
              <li className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-earth" aria-hidden="true" />
                <span>
                  {formatStayDate(query.checkIn, locale)} → {formatStayDate(query.checkOut, locale)}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <BedDouble className="h-4 w-4 text-earth" aria-hidden="true" />
                {ts("nights", { count: query.nights })}
              </li>
              <li className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-earth" aria-hidden="true" />
                {ts("adults", { count: query.adults })}
              </li>
              <li className="flex items-center gap-2.5">
                <Coffee className="h-4 w-4 text-earth" aria-hidden="true" />
                {tr("breakfast")}
              </li>
            </ul>

            <details className="group border-t border-rule pt-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between text-muted">
                {t("priceDetails")}
                <span className="text-xs underline underline-offset-4 group-open:hidden">{t("show")}</span>
              </summary>
              <ul className="mt-2 grid gap-1">
                {a.nightly.map((n) => (
                  <li key={n.date} className="flex justify-between gap-3">
                    <span className="text-muted">{formatStayDate(new Date(`${n.date}T00:00:00Z`), locale)}</span>
                    <span dir="ltr">{fmt(n.price)}</span>
                  </li>
                ))}
              </ul>
            </details>

            <div className="flex items-baseline justify-between border-t border-ink pt-3">
              <span className="font-medium">{t("total")}</span>
              <span className="font-display text-3xl font-semibold" dir="ltr">
                {fmt(a.total)}
              </span>
            </div>
            <ul className="grid gap-1.5 text-sm text-granite">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-earth" aria-hidden="true" />
                {t("payOnArrival")}
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-earth" aria-hidden="true" />
                {t("noCard")}
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
