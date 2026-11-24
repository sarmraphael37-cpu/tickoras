import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-base disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-white shadow-glow hover:bg-brand-700 hover:shadow-lg",
        secondary:
          "glass-subtle text-ink hover:border-brand-400 hover:bg-surface/90",
        outline:
          "glass-subtle text-ink hover:border-brand-400 hover:bg-surface/90",
        ghost: "text-muted hover:bg-white/5 hover:text-ink",
        subtle: "bg-brand-50 text-accent-200 hover:bg-brand-100",
        danger: "bg-danger/90 text-white hover:bg-danger",
        link: "text-accent-300 underline-offset-4 hover:text-ice hover:underline",
        white: "bg-ice text-base hover:bg-white",
      },
      size: {
        sm: "h-9 px-3.5 text-[12.5px]",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
