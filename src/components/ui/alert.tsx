import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  info: {
    icon: Info,
    className: "glass border-info/25 bg-info/[0.07] text-ice",
    iconClass: "text-info",
  },
  success: {
    icon: CheckCircle2,
    className: "glass border-success/25 bg-success/[0.07] text-ink",
    iconClass: "text-success",
  },
  warning: {
    icon: AlertTriangle,
    className: "glass border-warning/25 bg-warning/[0.07] text-ink",
    iconClass: "text-warning",
  },
  danger: {
    icon: XCircle,
    className: "glass border-danger/25 bg-danger/[0.07] text-ink",
    iconClass: "text-danger",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const config = tones[tone];
  const Icon = config.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3.5 text-[13px] leading-6",
        config.className,
        className,
      )}
      role="status"
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClass)} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
      {action}
    </div>
  );
}
