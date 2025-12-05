import { cn } from "@/lib/cn"

export function Label({
  className,
  children,
  htmlFor,
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-semibold text-slate-700", className)}
    >
      {children}
    </label>
  )
}
