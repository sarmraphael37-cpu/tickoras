import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** All public event times are displayed in Cameroon time unless a record says otherwise. */
export const DEFAULT_TIMEZONE = "Africa/Douala";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a whole-XAF amount, e.g. 12 500 FCFA. */
export function formatXAF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "—";
  }
  const formatted = new Intl.NumberFormat("fr-CM", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `${formatted} FCFA`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export function formatDate(
  value: string | Date,
  opts: Intl.DateTimeFormatOptions = {},
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
    ...opts,
  }).format(date);
}

export function formatShortDate(
  value: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return formatDate(
    value,
    { weekday: undefined, year: undefined },
    timeZone,
  );
}

export function formatTime(
  value: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

export function formatDateTime(
  value: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return `${formatDate(value, {}, timeZone)} · ${formatTime(value, timeZone)}`;
}

export function formatInputDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function relativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * 24 * 3600_000],
    ["month", 30 * 24 * 3600_000],
    ["week", 7 * 24 * 3600_000],
    ["day", 24 * 3600_000],
    ["hour", 3600_000],
    ["minute", 60_000],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "minute") {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return "just now";
}

export function countdown(expiresAt: string | Date): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "T";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(text: string, length = 140): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}

/** Only allow same-site relative redirects. */
export function safeRedirect(path: string | null | undefined, fallback = "/"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  return path;
}

export function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildQueryString(
  params: Record<string, string | number | undefined | null>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  }
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export function daysUntil(value: string | Date): number {
  const ms = new Date(value).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function isEventPast(endAt: string | Date): boolean {
  return new Date(endAt).getTime() < Date.now();
}

export function getInitialsColor(name: string): string {
  const palette = [
    "bg-brand-100 text-accent-200",
    "bg-warning/20 text-warning",
    "bg-info/20 text-info",
    "bg-danger/15 text-danger",
    "bg-brand-50 text-accent-200",
  ];
  const sum = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[sum % palette.length];
}
