import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn, formatShortDate } from "@/lib/utils";

export interface ScannerEventCardData {
  id: string;
  title: string;
  city: string;
  venueName: string;
  startsAt: string;
  coverImageUrl?: string | null;
  expected: number;
  checkedIn: number;
  remaining: number;
}

export function ScannerEventCard({ event }: { event: ScannerEventCardData }) {
  const pct =
    event.expected > 0
      ? Math.min(100, Math.round((event.checkedIn / event.expected) * 100))
      : 0;
  return (
    <Link
      href={`/scanner/events/${event.id}`}
      className="group overflow-hidden rounded-2xl border border-line bg-card shadow-card transition hover:border-brand-400/60"
    >
      <div className="relative aspect-[16/8] bg-brand-50">
        {event.coverImageUrl ? (
          <Image
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-3xl text-accent-300">
            {event.title.charAt(0)}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-forest/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
          {formatShortDate(event.startsAt)}
        </span>
      </div>
      <div className="p-4">
        <p className="truncate text-[13.5px] font-semibold text-ink">
          {event.title}
        </p>
        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted">
          <MapPin className="h-3 w-3 shrink-0 text-brand-400" />
          {event.venueName}, {event.city}
        </p>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10.5px] text-muted">
            <span>{event.checkedIn} in</span>
            <span>{event.remaining} left</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct >= 90 ? "bg-success" : "bg-brand-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
