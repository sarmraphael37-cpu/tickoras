import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-accent-300">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      ) : null}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {children}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-5")}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
