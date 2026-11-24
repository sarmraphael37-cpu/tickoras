import Image from "next/image";
import { cn, getInitialsColor, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    xs: "h-7 w-7 text-[10px]",
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-lg",
  };
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        sizes[size],
        !src && getInitialsColor(name || "T"),
        className,
      )}
      aria-hidden="true"
    >
      {src ? (
        <Image src={src} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
