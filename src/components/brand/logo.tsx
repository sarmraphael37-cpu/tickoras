import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * TICKORA mark — recreated from the supplied brand artwork.
 * The original uploaded PNG can replace this without changing any call sites.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-10 w-10", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tickora-ring" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="0.45" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="tickora-silver" x1="24" y1="16" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#E2E8F0" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="tickora-ticket" x1="36" y1="20" x2="58" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <radialGradient id="tickora-core" cx="0" cy="0" r="1" gradientTransform="translate(32 32) rotate(90) scale(28)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#11243D" />
          <stop offset="1" stopColor="#071426" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="26" fill="url(#tickora-core)" />
      <path
        d="M52.5 22.5A24 24 0 1 0 54 40"
        stroke="url(#tickora-ring)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      <path d="M23 23H43L40.5 29H33.5V43H27.5V29H20.5L18 23H23Z" fill="url(#tickora-silver)" />

      <path
        d="M37.5 24.5L55 37.5C56.4 38.6 56.2 40.7 54.6 41.5L44 46.5L31.5 37L37.5 24.5Z"
        fill="url(#tickora-ticket)"
      />
      <path
        d="M48.5 37.5C48.5 38.6 47.6 39.5 46.5 39.5C45.4 39.5 44.5 38.6 44.5 37.5C44.5 36.4 45.4 35.5 46.5 35.5C47.6 35.5 48.5 36.4 48.5 37.5Z"
        fill="#0B1C33"
      />
      <circle cx="42" cy="41" r="1.1" fill="#0B1C33" />
      <circle cx="45" cy="43" r="1.1" fill="#0B1C33" />

      <path
        d="M12 40C20 48 34 54 45 51C37 58 22 57 14 49L12 40Z"
        fill="#1D4ED8"
        opacity="0.8"
      />
    </svg>
  );
}

export function Logo({
  className,
  variant = "dark",
  compact = false,
}: {
  className?: string;
  variant?: "dark" | "light";
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-lg",
        className,
      )}
      aria-label="TICKORA home"
    >
      <LogoMark className="h-11 w-11 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-[19px] font-bold tracking-[0.14em] text-transparent",
              variant === "light" && "from-white to-slate-200",
            )}
          >
            TICKORA
          </span>
          <span className="mt-1 text-[7px] font-semibold uppercase tracking-[0.18em] text-muted">
            Discover. <span className="text-brand-400">Book.</span> Experience.
          </span>
        </span>
      )}
    </Link>
  );
}
