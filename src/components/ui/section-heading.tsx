import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function SectionHeading({
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "items-center text-center sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="display-title mt-2 text-[30px] leading-[1.1] sm:text-[38px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-[14px] leading-6 text-muted sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "group shrink-0 self-start sm:self-auto",
          )}
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
