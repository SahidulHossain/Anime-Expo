import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const result: (number | "gap")[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("gap")
    result.push(p)
  })
  return result
}

export function PaginationNav({
  page,
  totalPages,
  hrefFor,
}: {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}) {
  if (totalPages <= 1) return null

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition-colors"

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(base, "hover:border-primary/60 hover:text-primary")}>
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous page</span>
        </Link>
      ) : (
        <span className={cn(base, "opacity-40")} aria-hidden="true">
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pageWindow(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
            {"..."}
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              base,
              p === page
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-primary/60 hover:text-primary",
            )}
          >
            {p}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(base, "hover:border-primary/60 hover:text-primary")}>
          <ChevronRight className="size-4" />
          <span className="sr-only">Next page</span>
        </Link>
      ) : (
        <span className={cn(base, "opacity-40")} aria-hidden="true">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  )
}
