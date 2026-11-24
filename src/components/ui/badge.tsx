import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wide whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border border-white/10 bg-white/5 text-muted",
        brand: "border border-brand-400/25 bg-brand-500/12 text-accent-200",
        success: "border border-success/25 bg-success/10 text-success",
        warning: "border border-warning/25 bg-warning/10 text-warning",
        danger: "border border-danger/25 bg-danger/10 text-danger",
        info: "border border-info/25 bg-info/10 text-info",
        dark: "border border-white/10 bg-deep/80 text-ice",
        outline: "border border-white/12 bg-white/[0.03] text-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
