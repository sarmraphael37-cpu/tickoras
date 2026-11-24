import {
  BriefcaseBusiness,
  CalendarDays,
  Laptop,
  Music,
  Palette,
  Sparkles,
  Trophy,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Music,
  Laptop,
  Palette,
  UtensilsCrossed,
  Trophy,
  Users,
  BriefcaseBusiness,
  Sparkles,
};

export function CategoryIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || Sparkles;
  return <Icon className={cn("h-5 w-5", className)} strokeWidth={1.6} />;
}

export function EventMetaIcon({ type }: { type: "date" | "location" }) {
  return type === "date" ? (
    <CalendarDays className="h-3.5 w-3.5" />
  ) : (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M8 14s5-4.1 5-8A5 5 0 0 0 3 6c0 3.9 5 8 5 8Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="6" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
