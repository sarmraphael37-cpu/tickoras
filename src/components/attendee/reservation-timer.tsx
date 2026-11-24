"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReservationTimer({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );
  const refreshed = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSeconds(remaining);
      if (remaining === 0 && !refreshed.current) {
        refreshed.current = true;
        window.setTimeout(() => router.refresh(), 1200);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, router]);

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const urgent = seconds <= 120;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] font-medium",
        seconds === 0
          ? "border-danger/30 bg-danger/15 text-danger"
          : urgent
            ? "border-warning/30 bg-warning/15 text-warning"
            : "border-brand-200 bg-brand-50 text-accent-200",
      )}
      role="timer"
      aria-live="polite"
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      {seconds === 0 ? (
        <span>Reservation expired — release in progress.</span>
      ) : (
        <span>
          Seats held for{" "}
          <strong className="font-mono tabular-nums">
            {minutes}:{String(rest).padStart(2, "0")}
          </strong>
        </span>
      )}
    </div>
  );
}
