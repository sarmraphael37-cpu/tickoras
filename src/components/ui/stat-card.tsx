import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down" };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted">
          {label}
        </p>
        {Icon ? (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-accent-300">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-[26px] font-semibold tracking-[-0.03em] text-ink">
        {value}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium",
              trend.direction === "up" ? "text-success" : "text-danger",
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend.value}
          </span>
        ) : null}
        {hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
