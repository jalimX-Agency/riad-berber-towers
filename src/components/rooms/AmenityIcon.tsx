import { Bath, Coffee, Fence, Flame, ShowerHead, Snowflake, Sunrise, Wifi, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  heated_floor: Flame,
  air_conditioning: Snowflake,
  private_bathroom: Bath,
  wifi: Wifi,
  private_terrace: Sunrise,
  balcony: Fence,
  coffee_maker: Coffee,
  tadelakt_shower: ShowerHead,
};

export function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Bath;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.5} />;
}
