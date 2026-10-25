import type { ReactNode } from "react"

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
        <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
        {title}
      </h2>
      {action}
    </div>
  )
}
