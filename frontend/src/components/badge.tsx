import React from "react"
import { cx } from "../lib/utils"

type BadgeVariant = "default" | "success" | "error" | "warning" | "neutral"

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-blue-50 text-blue-700 ring-blue-700/10",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-700/10",
  error: "bg-red-50 text-red-700 ring-red-700/10",
  warning: "bg-amber-50 text-amber-700 ring-amber-700/10",
  neutral: "bg-gray-50 text-gray-700 ring-gray-700/10",
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  ),
)
Badge.displayName = "Badge"

export { Badge, type BadgeVariant }
