import type { BookingSource } from "@prisma/client";
import { Briefcase, DoorOpen, Globe, Mail, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

// Small marks for the admin only (who sold the stay). Airbnb, Booking.com and Expedia are drawn as simple brand-coloured tiles.
// Expedia has no booking source of its own in the database: its reservations are AGENCY bookings recognised by their note.

/** Who sold the stay, as shown in the admin (the database source, plus Expedia). */
export type Platform = BookingSource | "EXPEDIA";

export const PLATFORM_COLORS = {
  AIRBNB: { bg: "#FF385C", fg: "#ffffff", label: "Airbnb" },
  BOOKING_COM: { bg: "#003580", fg: "#ffffff", label: "Booking.com" },
  EXPEDIA: { bg: "#191E3B", fg: "#ffffff", label: "Expedia" },
} as const;

function AirbnbMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#FF385C" />
      {/* simplified "bélo" outline */}
      <path
        d="M16 6.5c-1.3 0-2.3.8-3 2.2L8 19.4c-.4.9-.6 1.6-.6 2.3 0 2.2 1.7 3.8 3.8 3.8 1.6 0 3-.9 4.8-2.8 1.8 1.9 3.2 2.8 4.8 2.8 2.1 0 3.8-1.6 3.8-3.8 0-.7-.2-1.4-.6-2.3L19 8.7c-.7-1.4-1.7-2.2-3-2.2Zm0 4.1 3.6 8.1c-.6 1.5-1.8 2.5-3.6 2.5s-3-1-3.6-2.5L16 10.6Zm0 13.1c-1 1-1.9 1.6-2.8 1.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookingMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#003580" />
      <text x="8.5" y="23" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="18" fill="#fff">
        B
      </text>
      <circle cx="23.5" cy="21.5" r="2.4" fill="#009FE3" />
    </svg>
  );
}

function ExpediaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#191E3B" />
      <text x="9" y="23" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="18" fill="#FDDB32">
        e
      </text>
    </svg>
  );
}

function SiteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#7a4a2a" />
      {/* tower silhouette: the riad's own site */}
      <path d="M11 25V13l5-5 5 5v12h-3.5v-5h-3v5Z" fill="#fff" />
    </svg>
  );
}

const lucide: Partial<Record<BookingSource, typeof Phone>> = { WHATSAPP: MessageCircle, PHONE: Phone, EMAIL: Mail, AGENCY: Briefcase, WALK_IN: DoorOpen };
const lucideTone: Partial<Record<BookingSource, string>> = {
  WHATSAPP: "bg-[#25D366] text-white",
  PHONE: "bg-stone-700 text-white",
  EMAIL: "bg-sky-700 text-white",
  AGENCY: "bg-amber-700 text-white",
  WALK_IN: "bg-stone-500 text-white",
};

/** The icon of the platform or channel a booking came from. */
export function PlatformIcon({ source, className }: { source: Platform; className?: string }) {
  const size = cn("h-4 w-4 shrink-0", className);
  if (source === "EXPEDIA") return <ExpediaMark className={size} />;
  if (source === "AIRBNB") return <AirbnbMark className={size} />;
  if (source === "BOOKING_COM") return <BookingMark className={size} />;
  if (source === "WEBSITE") return <SiteMark className={size} />;
  const Icon = lucide[source] ?? Globe;
  return (
    <span className={cn("grid place-items-center rounded-[4px]", lucideTone[source] ?? "bg-stone-500 text-white", size)} aria-hidden="true">
      <Icon className="h-[70%] w-[70%]" />
    </span>
  );
}

/** Channel marks used in the price rows (Booking.com / Airbnb / Expedia / site). */
export function ChannelMark({ channel, className }: { channel: "site" | "booking" | "airbnb" | "expedia"; className?: string }) {
  const size = cn("h-4 w-4 shrink-0", className);
  if (channel === "expedia") return <ExpediaMark className={size} />;
  if (channel === "airbnb") return <AirbnbMark className={size} />;
  if (channel === "booking") return <BookingMark className={size} />;
  return <SiteMark className={size} />;
}
