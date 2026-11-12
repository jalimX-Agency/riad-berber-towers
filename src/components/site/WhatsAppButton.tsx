import { getTranslations } from "next-intl/server";
import { site } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

/** Floating WhatsApp shortcut, bottom end corner (flips in Arabic). */
export async function WhatsAppButton() {
  const t = await getTranslations("whatsapp");
  const href = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(t("message"))}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("label")}
      title={t("label")}
      className="fixed bottom-[max(20px,env(safe-area-inset-bottom))] end-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#1F7A4D] text-white shadow-[0_8px_24px_rgba(47,32,22,0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
