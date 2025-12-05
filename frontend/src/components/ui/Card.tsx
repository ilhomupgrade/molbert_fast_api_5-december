import { cn } from "@/lib/cn"

export function Card({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl border border-white/60 bg-white/60 p-6 text-slate-900 shadow-xl",
        className,
      )}
    >
      {children}
    </div>
  )
}
