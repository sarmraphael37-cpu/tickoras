import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Home",
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-line bg-cream", className)}>
      <div className="container-page py-10 sm:py-14">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        ) : null}
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1 className="display-title mt-3 text-[40px] leading-[0.99] sm:text-[56px]">
              {title}
            </h1>
            {description ? (
              <p className="mt-5 max-w-xl text-[14px] leading-7 text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {children ? <div className="shrink-0">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
