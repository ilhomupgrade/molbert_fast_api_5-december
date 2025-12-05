import { cn } from "@/lib/cn"
import { forwardRef } from "react"

type ButtonVariant = "solid" | "outline" | "ghost"
type ButtonSize = "sm" | "md" | "lg"

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
}

const variantClasses: Record<ButtonVariant, string> = {
  solid:
    "bg-slate-900 text-white shadow hover:bg-slate-800 disabled:bg-slate-300 disabled:text-white",
  outline:
    "border border-slate-300 text-slate-800 hover:bg-white disabled:text-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100 disabled:text-slate-400",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "solid", size = "md", loading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading ? "..." : children}
      </button>
    )
  },
)
