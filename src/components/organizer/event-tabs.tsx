import Link from "next/link";
import { Activity, BarChart3, LayoutDashboard, Ticket, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview", href: (id: string) => `/organizer/events/${id}`, icon: LayoutDashboard },
  { key: "tickets", label: "Tickets", href: (id: string) => `/organizer/events/${id}/tickets`, icon: Ticket },
  { key: "attendees", label: "Attendees", href: (id: string) => `/organizer/events/${id}/attendees`, icon: Users },
  { key: "analytics", label: "Analytics", href: (id: string) => `/organizer/events/${id}/analytics`, icon: BarChart3 },
] as const;

export function EventTabs({
  eventId,
  active,
}: {
  eventId: string;
  active: (typeof TABS)[number]["key"];
}) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-card p-1 no-scrollbar"
      aria-label="Event sections"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href(eventId)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-[11.5px] font-medium transition",
              isActive
                ? "bg-brand-600 text-white shadow-glow"
                : "text-muted hover:bg-surface hover:text-ink",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
      <Link
        href="/organizer/check-ins"
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-[11.5px] font-medium text-muted transition hover:bg-surface hover:text-ink"
      >
        <Activity className="h-3.5 w-3.5" />
        Check-ins
      </Link>
    </nav>
  );
}
