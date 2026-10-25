"use client"

import useSWR from "swr"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"
import { Search as SearchIcon, AlertCircle } from "lucide-react"
import type { AnimeSummary, Paginated } from "@/lib/types"
import { AnimeCardGrid, AnimeGridSkeleton } from "@/components/anime-card"
import { PaginationNav } from "@/components/pagination-nav"

const fetcher = async (url: string): Promise<Paginated<AnimeSummary>> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Search failed")
  return res.json()
}

export function SearchClient() {
  const router = useRouter()
  const params = useSearchParams()
  const q = params.get("q") ?? ""
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1)
  const [input, setInput] = useState(q)

  useEffect(() => {
    setInput(q)
  }, [q])

  const { data, error, isLoading } = useSWR(
    q ? `/api/search?q=${encodeURIComponent(q)}&page=${page}` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  )

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = input.trim()
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search")
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Search</h1>
      <p className="mb-5 text-sm text-muted-foreground">Find anime by title.</p>

      <form onSubmit={submit} className="mb-8">
        <div className="relative max-w-2xl">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search anime..."
            aria-label="Search anime"
            className="h-12 w-full rounded-full border border-border bg-secondary/60 pl-12 pr-28 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Search
          </button>
        </div>
      </form>

      {!q && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <SearchIcon className="mb-4 size-10 text-muted-foreground" />
          <p className="text-lg font-semibold">Start typing to search</p>
          <p className="text-sm text-muted-foreground">Search thousands of anime titles.</p>
        </div>
      )}

      {q && isLoading && <AnimeGridSkeleton count={18} />}

      {q && error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="mb-4 size-10 text-primary" />
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="text-sm text-muted-foreground">Please try your search again.</p>
        </div>
      )}

      {q && !isLoading && !error && data && (
        <>
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <SearchIcon className="mb-4 size-10 text-muted-foreground" />
              <p className="text-lg font-semibold">No results for &ldquo;{q}&rdquo;</p>
              <p className="text-sm text-muted-foreground">Try a different title or spelling.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {data.total.toLocaleString()} {data.total === 1 ? "result" : "results"} for{" "}
                <span className="font-semibold text-foreground">&ldquo;{q}&rdquo;</span>
              </p>
              <AnimeCardGrid items={data.items} />
              <PaginationNav
                page={data.page}
                totalPages={data.totalPages}
                hrefFor={(p) => `/search?q=${encodeURIComponent(q)}&page=${p}`}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
