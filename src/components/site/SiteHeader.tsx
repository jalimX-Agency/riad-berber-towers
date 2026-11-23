"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { mediaUrl } from "@/lib/media";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { primaryNav } from "@/lib/nav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { WeaveBand } from "./WeaveBand";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close the menu on navigation, lock page scroll while it is open
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-500",
        scrolled ? "bg-paper/90 backdrop-blur-md shadow-[0_1px_0_var(--rule)]" : "bg-transparent",
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 btn-primary">
        {t("skip")}
      </a>
      <div className="container-site flex h-[80px] max-w-[1440px] items-center justify-between gap-6">
        <Brand />

        <nav aria-label={t("primary")} className="hidden min-[1360px]:flex items-center gap-5 2xl:gap-7">
          {primaryNav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              className="nav-link text-ink hover:text-earth"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <LanguageSwitcher className="hidden md:block" />
          <Link href="/rooms" className="btn-primary hidden whitespace-nowrap sm:inline-flex">
            {t("book")}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="min-[1360px]:hidden grid h-11 w-11 place-items-center rounded-full border border-rule text-ink"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{t("menu")}</span>
          </button>
        </div>
      </div>
    </header>

      {/* Mobile menu: outside <header>, whose backdrop-filter would trap position:fixed */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        hidden={!open}
        className="fixed inset-0 z-50 flex flex-col bg-ink text-snow min-[1360px]:hidden"
      >
        <div className="container-site flex h-[80px] items-center justify-between">
          <Brand ivory />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-full border border-snow/25"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{t("close")}</span>
          </button>
        </div>
        <nav aria-label={t("primary")} className="container-site flex flex-1 flex-col justify-center gap-2">
          {primaryNav.map((item, i) => (
            <Link
              key={item.key}
              href={item.href}
              className="group flex items-baseline gap-4 py-2 font-display text-4xl text-snow hover:text-ochre"
            >
              <span className="meta text-granite">{String(i + 1).padStart(2, "0")}</span>
              <span className="[html[dir=rtl]_&]:font-[family-name:var(--font-arabic-display)]">{t(item.key)}</span>
            </Link>
          ))}
        </nav>
        <div className="container-site grid gap-6 pb-[max(28px,env(safe-area-inset-bottom))]">
          <Link href="/rooms" className="btn-primary justify-center bg-earth hover:bg-ochre">
            {t("book")}
          </Link>
          <LanguageSwitcher tone="dark" placement="up" className="justify-self-center" />
        </div>
        <WeaveBand />
      </div>
    </>
  );
}

/** Header lockup: emblem SVG + the name set live in Cormorant, so it stays legible at header size. */
function Brand({ ivory = false }: { ivory?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Riad Berber Towers">
      <Image
        src={mediaUrl(ivory ? "brand/rbt-emblem-ivory.svg" : "brand/rbt-emblem-color.svg")}
        unoptimized
        alt=""
        width={2483}
        height={2727}
        priority={!ivory}
        className="h-12 w-auto"
      />
      <span className={cn("grid leading-none", ivory ? "text-snow" : "text-ink")} lang="en" dir="ltr">
        <span className="font-display text-[1.05rem] font-semibold tracking-[0.12em] sm:text-lg">RIAD BERBER TOWERS</span>
        <span className="mt-1 font-display text-[0.8rem] italic text-granite">breathe the atlas</span>
      </span>
    </Link>
  );
}
