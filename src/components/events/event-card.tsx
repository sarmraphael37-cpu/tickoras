import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { EventSummary } from "@/lib/domain";
import {
  cn,
  DEFAULT_TIMEZONE,
  formatShortDate,
  formatTime,
  formatXAF,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function EventCard({
  event,
  className,
  variant = "default",
}: {
  event: EventSummary;
  className?: string;
  variant?: "default" | "wide" | "minimal";
}) {
  const date = new Date(event.startAt);
  const timeZone = event.timezone || DEFAULT_TIMEZONE;
  const day = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    timeZone,
  }).format(date);
  const month = new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone,
  })
    .format(date)
    .toUpperCase();
  const cityLabel = event.city;
  const remaining =
    event.capacity > 0 ? Math.max(0, event.capacity - event.ticketsSold) : null;

  if (variant === "minimal") {
    return (
      <Link
        href={`/events/${event.slug}`}
        className={cn(
          "group flex items-center gap-4 rounded-xl border border-transparent p-3 transition hover:border-line hover:bg-card",
          className,
        )}
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
          {event.coverImageUrl ? (
            <Image
              src={event.coverImageUrl}
              alt=""
              fill
              sizes="56px"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-100 text-lg font-semibold text-accent-300">
              {event.title.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink group-hover:text-accent-200">
            {event.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
            {formatShortDate(event.startAt, timeZone)} · {cityLabel}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-accent-300">
          {event.startingPriceXaf === null
            ? "—"
            : event.startingPriceXaf === 0
              ? "Free"
              : `From ${formatXAF(event.startingPriceXaf)}`}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden glass rounded-2xl shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-float",
        variant === "wide" && "sm:flex-row",
        className,
      )}
    >
      <div
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden bg-brand-50",
          variant === "wide" && "sm:aspect-auto sm:w-[44%]",
        )}
      >
        {event.coverImageUrl ? (
          <Image
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-cream font-display text-4xl text-accent-200">
            {event.title.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-col items-center rounded-lg glass-strong px-2.5 py-1.5 text-center shadow-sm backdrop-blur">
          <span className="text-[16px] font-semibold leading-none text-ink">{day}</span>
          <span className="mt-1 text-[9px] font-bold tracking-[0.12em] text-accent-300">
            {month}
          </span>
        </div>
        <div className="absolute bottom-3 left-4 flex flex-wrap gap-1.5">
          {event.categoryName ? (
            <Badge
              tone="dark"
              className="bg-black/45 text-white backdrop-blur-md"
            >
              {event.categoryName}
            </Badge>
          ) : null}
          {remaining === 0 ? (
            <Badge tone="danger" className="glass-strong">
              Sold out
            </Badge>
          ) : remaining !== null && remaining <= 20 ? (
            <Badge tone="warning" className="glass-strong">
              Few left
            </Badge>
          ) : null}
        </div>
        <span className="absolute bottom-3 right-4 inline-flex items-center gap-1 rounded-full glass-strong px-2.5 py-1 text-[10px] font-semibold text-ink opacity-0 shadow-sm transition group-hover:opacity-100">
          View event <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.015em] text-ink transition-colors group-hover:text-accent-200">
          {event.title}
        </h3>
        <div className="mt-2.5 space-y-1.5 text-[12px] text-muted">
          <p className="flex items-center gap-1.5">
            <span className="text-accent-300">
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v3l2 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </span>
            {formatShortDate(event.startAt, timeZone)} ·{" "}
            {formatTime(event.startAt, timeZone)}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-accent-300" />
            <span className="truncate">
              {event.venueName}, {cityLabel}
            </span>
          </p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3.5">
          <p className="truncate text-[11px] text-muted">{event.organizerName}</p>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted">From</p>
            <p className="text-[13px] font-semibold text-ink">
              {event.startingPriceXaf === null
                ? "Coming soon"
                : event.startingPriceXaf === 0
                  ? "Free"
                  : formatXAF(event.startingPriceXaf)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
