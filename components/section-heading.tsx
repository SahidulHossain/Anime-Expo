import type { ReactNode } from "react"

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
          <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
          {title}
        </h2>
        {subtitle && <p className="mt-1 pl-3 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:text-sm">{action}</div>}
    </div>
  )
}
