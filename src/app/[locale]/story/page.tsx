import Image from "next/image";
import { withSocial } from "@/lib/seo";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing, localePath } from "@/i18n/routing";
import { mediaUrl } from "@/lib/media";
import { activityMedia } from "@/lib/activities";
import { pagesCopy } from "@/lib/pages";
import { StoryDay, type Hour } from "@/components/story/StoryDay";

type Props = { params: Promise<{ locale: string }> };

const ph = (key: string, w: number, h: number) => ({ src: mediaUrl(`photos/${key}`), w, h });
/** one photo per hour of the day, in order */
const HOURS = [
  ph("outside-day/dji_20250428172208_0311_d.webp", 1920, 1080),
  ph("outside-day/dji_20250428172016_0304_d.webp", 1920, 1080),
  ph("outside-day/dsc00472-modifier.webp", 1920, 1280),
  activityMedia.ingredients,
  ph("living-room/dsc00406.webp", 1920, 1280),
  ph("outside-night/dji_20250429201942_0453_d-enhanced-nr-modifier.webp", 1920, 1080),
];
/** material close-ups: zellij, carved wood, tadelakt, iron, glass (object-position frames the detail) */
const MATERIALS = [
  { ...ph("bathroom/dsc00356.webp", 1920, 1280), pos: "50% 70%" },
  { ...ph("reception/dsc00422.webp", 1280, 1920), pos: "30% 55%" },
  { ...ph("reception/dsc00413.webp", 1280, 1920), pos: "70% 35%" },
  { ...ph("inside/dsc00380.webp", 1920, 1280), pos: "50% 80%" },
  { ...ph("inside/dsc00401.webp", 1920, 1280), pos: "50% 15%" },
];
const PILL = ph("tea-man/dsc00470.webp", 1920, 1280);
const NIGHT = ph("outside-night/dji_20250429201732_0445_d-enhanced-nr-modifier.webp", 1920, 1080);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const s = pagesCopy(locale).story;
  return withSocial(locale, {
    title: s.meta.title,
    description: s.meta.description,
    alternates: { canonical: localePath(locale, "/story"), languages: Object.fromEntries(routing.locales.map((l) => [l, localePath(l, "/story")])) },
    openGraph: { images: [{ url: HOURS[5].src, width: HOURS[5].w, height: HOURS[5].h }] },
  });
}

export default async function StoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const s = pagesCopy(locale).story;
  const hours: Hour[] = s.day.hours.map((h, i) => ({ ...h, photo: HOURS[i] }));

  return (
    <>
      {/* 1 · Headline with a photo set inside the words */}
      <section className="container-site grid gap-10 pb-16 pt-10 md:pt-16 lg:pb-24">
        <p className="label">{s.label}</p>
        <h1 className="max-w-[14ch] text-[clamp(3.2rem,10vw,9.5rem)] leading-[0.92] tracking-[-0.02em] [html[dir=rtl]_&]:leading-[1.3]">
          {s.title[0]}{" "}
          <span className="relative inline-block h-[0.78em] w-[1.5em] translate-y-[0.08em] overflow-hidden rounded-full align-baseline">
            <Image src={PILL.src} alt="" fill priority sizes="20vw" className="object-cover" />
          </span>{" "}
          <em className="font-display not-italic text-earth [html[dir=rtl]_&]:font-arabic-display">{s.title[1]}</em>
        </h1>
        <div className="grid gap-6 border-t border-ink/80 pt-6 md:grid-cols-12">
          <p className="text-[17px] leading-relaxed text-ink/80 md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8">{s.lead}</p>
          <ul className="meta flex flex-wrap gap-x-5 gap-y-1 text-granite md:col-span-5 md:row-start-1" dir="ltr">
            {s.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2 · Ten years, from the land to the open door (owner's own story) */}
      <section aria-labelledby="decade-title" className="bg-ink py-16 text-snow lg:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="grid content-start gap-4 lg:col-span-5">
            <p className="label text-ochre">{s.decade.label}</p>
            <h2 id="decade-title" className="text-4xl lg:text-5xl">{s.decade.title}</h2>
            <p className="text-snow/75">{s.decade.text}</p>
            <p className="font-display italic text-snow/60 [html[dir=rtl]_&]:not-italic">— {s.decade.sign}</p>
          </div>
          <ol className="grid gap-6 self-center lg:col-span-7 lg:col-start-6" dir="ltr">
            <li className="grid gap-1">
              <span className="font-mono text-[clamp(4.5rem,13vw,10rem)] leading-[0.85] tracking-tighter text-snow/90">2014</span>
              <span className="label text-ochre">{s.decade.from}</span>
            </li>
            <li aria-hidden="true" className="relative ms-[0.6em] h-24 w-px bg-gradient-to-b from-ochre to-earth lg:h-28">
            </li>
            <li className="grid justify-items-end gap-1 text-end">
              <span className="font-mono text-[clamp(4.5rem,13vw,10rem)] leading-[0.85] tracking-tighter text-ochre">2025</span>
              <span className="label text-ochre">{s.decade.to}</span>
            </li>
          </ol>
        </div>
      </section>

      {/* 3 · One day at the house (signature) */}
      <section aria-labelledby="day-title" className="container-site pb-16 lg:pb-8">
        <header className="grid gap-2 pb-6 lg:pb-0">
          <p className="label">{s.day.label}</p>
          <h2 id="day-title" className="text-4xl lg:hidden">{s.day.title}</h2>
          <h2 className="sr-only hidden lg:block">{s.day.title}</h2>
        </header>
        <StoryDay hours={hours} label={s.day.title} />
      </section>

      {/* 3 · Touch: material slices that open on hover / focus */}
      <section aria-labelledby="touch-title" className="bg-walnut py-16 text-snow lg:py-24">
        <div className="container-site grid gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="touch-title" className="text-4xl lg:text-6xl">{s.touch.title}</h2>
            <p className="label text-ochre">{s.touch.label}</p>
          </div>
          <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:h-[64vh] lg:min-h-[460px] lg:overflow-visible lg:px-0 lg:pb-0">
            {s.touch.materials.map((m, i) => (
              <li
                key={m.name}
                tabIndex={0}
                className="group relative w-[78vw] shrink-0 snap-start overflow-hidden rounded-[6px] outline-none sm:w-[46vw] lg:w-auto lg:flex-[1] lg:transition-[flex-grow] lg:duration-500 lg:ease-out lg:hover:flex-[3.2] lg:focus-visible:flex-[3.2] lg:focus-visible:ring-2 lg:focus-visible:ring-ochre"
              >
                <div className="relative aspect-[3/4] lg:absolute lg:inset-0 lg:aspect-auto">
                  <Image src={MATERIALS[i].src} alt="" fill sizes="(min-width: 1024px) 40vw, 80vw" className="object-cover" style={{ objectPosition: MATERIALS[i].pos }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 grid gap-2 p-5">
                  <span className="meta text-ochre" dir="ltr">0{i + 1}</span>
                  <h3 className="text-2xl leading-tight lg:whitespace-nowrap">{m.name}</h3>
                  <p className="max-w-[32ch] text-sm text-snow/80 lg:max-h-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-500 lg:group-hover:max-h-40 lg:group-hover:opacity-100 lg:group-focus-visible:max-h-40 lg:group-focus-visible:opacity-100">
                    {m.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4 · One word */}
      <section className="container-site grid items-end gap-6 py-16 lg:grid-cols-12 lg:py-24">
        <p className="font-display text-[clamp(6rem,24vw,20rem)] leading-[0.8] tracking-[-0.03em] text-earth lg:col-span-7 [html[dir=rtl]_&]:font-arabic-display [html[dir=rtl]_&]:leading-[1.2]" lang={locale === "ar" ? "ar" : "zgh-Latn"}>
          {s.word.word}
        </p>
        <div className="grid gap-3 pb-4 lg:col-span-5">
          <p className="label">{s.word.label}</p>
          <p className="text-xl leading-relaxed lg:text-2xl">
            <span className="font-display italic [html[dir=rtl]_&]:not-italic">{s.word.word}</span> {s.word.text}
          </p>
        </div>
      </section>

      {/* 5 · Night, and the way in */}
      <section className="relative isolate">
        <div className="relative h-[70svh] min-h-[420px]">
          <Image src={NIGHT.src} alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
        </div>
        <div className="container-site absolute inset-x-0 bottom-0 grid gap-5 pb-12 text-snow lg:grid-cols-12 lg:items-end lg:pb-16">
          <h2 className="text-5xl lg:col-span-7 lg:text-7xl">{s.end.title}</h2>
          <div className="grid gap-4 lg:col-span-5">
            <p className="text-snow/75">{s.end.text}</p>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Link href="/rooms" className="group inline-flex items-center gap-2 border-b border-snow/40 pb-1 text-sm uppercase tracking-[0.16em] hover:border-ochre hover:text-ochre">
                {s.end.rooms}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
              <Link href="/contact" className="group inline-flex items-center gap-2 border-b border-snow/40 pb-1 text-sm uppercase tracking-[0.16em] hover:border-ochre hover:text-ochre">
                {s.end.contact}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
