import { getImageProps } from "next/image";
import { SearchBar } from "@/components/booking/SearchBar";
import { HeroVideo } from "@/components/home/HeroVideo";
import { homeMedia } from "@/lib/home-media";

export type HeroCopy = {
  line1: string;
  line2: string;
  line3: string;
  lead: string;
  alt: string;
  caption: string;
  searchLabel: string;
  fromPrice: string;
};

/**
 * The photo under the video: the portrait facade on phones, the drone shot from tablets up.
 * Each one is the first frame of its video, so the switch from photo to video is invisible.
 */
function HeroPicture({ alt }: { alt: string }) {
  const { heroMobile: m, heroDesktop: d } = homeMedia;
  const common = { alt, priority: true, quality: 75, sizes: "100vw" };
  const { props: mobile } = getImageProps({ ...common, src: m.src, width: m.w, height: m.h });
  const {
    props: { srcSet: desktopSet },
  } = getImageProps({ ...common, src: d.src, width: d.w, height: d.h });
  return (
    <picture className="absolute inset-0 block">
      <source media="(min-width: 768px)" srcSet={desktopSet} sizes="100vw" />
      {/* LCP element: fetched first, never lazy (getImageProps does not set these by itself) */}
      <img {...mobile} alt={alt} loading="eager" fetchPriority="high" className="h-full w-full object-cover" />
    </picture>
  );
}

/** Full-bleed hero: the house from morning to night on a silent loop, title in snow, search card overlapping below. */
export function HomeHero({ copy, today }: { copy: HeroCopy; today: string }) {
  return (
    <section className="relative">
      <div className="relative h-[calc(100svh-80px)] min-h-[560px] max-h-[980px] overflow-hidden bg-ink text-snow">
        <HeroPicture alt={copy.alt} />
        <HeroVideo desktop={homeMedia.heroVideo.desktop} mobile={homeMedia.heroVideo.mobile} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/55 via-45% to-ink/10" />
        <div className="container-site relative flex h-full flex-col justify-between pb-28 pt-6 lg:pb-36">
          <p className="meta flex flex-wrap gap-x-3 text-snow/80" dir="ltr">
            <span>31°08′ N</span>
            <span>7°55′ W</span>
            <span>1,740 m</span>
          </p>
          <div className="grid max-w-3xl gap-5">
            <h1 className="text-[clamp(3rem,14vw,4.6rem)] leading-[0.95] tracking-[-0.01em] lg:text-[clamp(4.5rem,7vw,7.5rem)] [html[dir=rtl]_&]:leading-[1.35]">
              <span className="block">{copy.line1}</span>
              <span className="block italic text-[#f0d7ae] [html[dir=rtl]_&]:not-italic">{copy.line2}</span>
              <span className="block">{copy.line3}</span>
            </h1>
            <p className="max-w-[46ch] text-[17px] text-snow/85">{copy.lead}</p>
          </div>
        </div>
      </div>
      <div className="container-site relative -mt-20 pb-14 lg:-mt-24 lg:max-w-[1100px]">
        <div className="grid gap-3 rounded-[16px] bg-paper p-3 shadow-[0_24px_50px_-24px_rgba(47,32,22,0.5)] sm:p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
            <p className="label">{copy.searchLabel}</p>
            <p className="text-xs text-muted">{copy.fromPrice}</p>
          </div>
          <SearchBar
            today={today}
            target="/rooms"
            idPrefix="hero-"
            layout="stacked"
            className="lg:[&>div]:grid-cols-[1fr_1fr_1fr_auto] lg:[&>div>*]:col-span-1 lg:[&>div>label]:border-b-0 lg:[&>div>label]:border-e"
          />
        </div>
      </div>
    </section>
  );
}
