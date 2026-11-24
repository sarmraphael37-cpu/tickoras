import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <span className="absolute -bottom-px left-0 h-px w-14 bg-brand-500" />
      <div className="min-w-0">
        {eyebrow ? (
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="page-title mt-2">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[12px] text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
