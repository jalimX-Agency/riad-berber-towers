"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { localeNames } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** light = on paper backgrounds, dark = on Cedar Ink (footer, mobile menu) */
  tone?: "light" | "dark";
  /** open the list above the trigger (footer, bottom of the mobile menu) */
  placement?: "down" | "up";
};

/** Custom language select (listbox pattern). Keeps the current page when switching. */
export function LanguageSwitcher({ className, tone = "light", placement = "down" }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(routing.locales.indexOf(locale));
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    setActive(routing.locales.indexOf(locale));
    listRef.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, locale]);

  function choose(next: Locale) {
    setOpen(false);
    buttonRef.current?.focus();
    if (next === locale) return;
    startTransition(() => router.replace(pathname, { locale: next }));
  }

  function onListKey(e: React.KeyboardEvent) {
    const n = routing.locales.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + n) % n); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(n - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(routing.locales[active]); }
    else if (e.key === "Escape" || e.key === "Tab") { setOpen(false); buttonRef.current?.focus(); }
  }

  const dark = tone === "dark";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t("language")}: ${localeNames[locale]}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); }
        }}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 transition-colors",
          dark ? "border-snow/25 text-snow hover:border-ochre" : "border-rule text-ink hover:border-earth",
          pending && "opacity-60",
        )}
      >
        <Globe className="h-4 w-4 opacity-70" aria-hidden="true" />
        <span className="meta uppercase text-[0.75rem]">{locale}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-60 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        tabIndex={-1}
        hidden={!open}
        aria-label={t("language")}
        aria-activedescendant={open ? `${listId}-${routing.locales[active]}` : undefined}
        onKeyDown={onListKey}
        className={cn(
          "absolute end-0 z-50 min-w-48 overflow-hidden rounded-[10px] border p-1.5 shadow-[0_18px_40px_rgba(47,32,22,0.18)] outline-none",
          placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
          dark ? "border-snow/15 bg-walnut text-snow" : "border-rule bg-snow text-ink",
        )}
      >
        {routing.locales.map((l, i) => {
          const selected = l === locale;
          return (
            <li
              key={l}
              id={`${listId}-${l}`}
              role="option"
              aria-selected={selected}
              lang={l}
              dir={l === "ar" ? "rtl" : "ltr"}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(l)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-6 rounded-md px-3 py-2.5 text-[0.95rem]",
                i === active && (dark ? "bg-snow/10" : "bg-paper"),
                selected && (dark ? "text-ochre" : "text-earth"),
              )}
            >
              <span className={l === "ar" ? "font-[family-name:var(--font-arabic)]" : ""}>{localeNames[l]}</span>
              <span className="flex items-center gap-2">
                <span className="meta uppercase opacity-60">{l}</span>
                <Check className={cn("h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")} aria-hidden="true" />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
