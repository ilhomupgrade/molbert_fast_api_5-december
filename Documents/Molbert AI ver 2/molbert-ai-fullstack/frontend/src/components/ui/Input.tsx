import { cn } from "@/lib/cn"
import { forwardRef } from "react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="space-y-1">
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-inner focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300",
          error && "border-rose-400 focus:ring-rose-200",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  ),
)
