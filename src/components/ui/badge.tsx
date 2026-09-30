import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4",
  {
    variants: {
      variant: {
        default: "bg-kbc-blue-soft text-kbc-blue-hover",
        navy: "bg-kbc-navy text-white",
        outline: "border border-kbc-line text-kbc-muted",
        high: "bg-rose-50 text-rose-700",
        medium: "bg-amber-50 text-amber-700",
        low: "bg-emerald-50 text-emerald-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
