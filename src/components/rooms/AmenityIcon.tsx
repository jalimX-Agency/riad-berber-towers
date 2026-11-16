import { Bath, BedDouble, BrickWall, Coffee, Fence, Flame, ShowerHead, Sunrise, Wifi, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  bed_choice: BedDouble,
  heated_floor: Flame,
  tadelakt_walls: BrickWall,
  zellij_shower: ShowerHead,
  private_bathroom: Bath,
  wifi: Wifi,
  private_terrace: Sunrise,
  balcony: Fence,
  coffee_maker: Coffee,
};

export function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Bath;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.5} />;
}
