import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono transition",
  {
    variants: {
      variant: {
        default: "bg-white text-zinc-700 border-zinc-200/80 shadow-subtle",
        success: "bg-emerald-50 text-emerald-800 border-emerald-200",
        danger: "bg-rose-50 text-rose-700 border-rose-200",
        warning: "bg-amber-50 text-amber-800 border-amber-200",
        accent: "bg-zinc-100 text-zinc-900 border-zinc-200",
        dark: "bg-zinc-950 text-white border-zinc-900 shadow-sm",
        outline: "bg-transparent text-zinc-600 border-zinc-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
