"use client"

import useSWR from "swr"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
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
  const [history, setHistory] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<AnimeSummary[]>([])
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const suggestionRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    try { setHistory(JSON.parse(window.localStorage.getItem("animexpo-search-history") || "[]")) } catch { setHistory([]) }
  }, [])

  useEffect(() => {
    const value = input.trim()
    if (!value) { setSuggestions([]); return }
    const timer = window.setTimeout(async () => {
      suggestionRequest.current?.abort()
      const controller = new AbortController()
      suggestionRequest.current = controller
      setSuggestionLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(value)}&page=1`, { signal: controller.signal })
        if (!response.ok) throw new Error("Suggestions failed")
        const result: Paginated<AnimeSummary> = await response.json()
        if (!controller.signal.aborted) setSuggestions(result.items.slice(0, 8))
      } catch (error) { if ((error as Error).name !== "AbortError") setSuggestions([]) }
      finally { if (!controller.signal.aborted) setSuggestionLoading(false) }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [input])

  function saveSearch(value: string) {
    const normalized = value.trim().replace(/\\s+/g, " ")
    if (!normalized) return
    const next = [normalized, ...history.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 10)
    setHistory(next)
    try { window.localStorage.setItem("animexpo-search-history", JSON.stringify(next)) } catch { /* storage unavailable */ }
  }

  function removeSearch(value: string) {
    const next = history.filter((item) => item !== value)
    setHistory(next)
    try { window.localStorage.setItem("animexpo-search-history", JSON.stringify(next)) } catch { /* storage unavailable */ }
  }

  function clearHistory() {
    setHistory([])
    try { window.localStorage.removeItem("animexpo-search-history") } catch { /* storage unavailable */ }
  }

  useEffect(() => {
    setInput(q)
  }, [q])

  const { data, error, isLoading } = useSWR(
    q ? `/api/search?q=${encodeURIComponent(q)}&page=${page}` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  )

  useEffect(() => {
    if (q && data && !error) saveSearch(q)
  }, [q, data, error])

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = input.trim()
    setShowSuggestions(false)
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
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Escape") setShowSuggestions(false)
              if (event.key === "ArrowDown" && suggestions[0]) { event.preventDefault(); setInput(suggestions[0].title) }
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search anime..."
            aria-label="Search anime"
            className="h-12 w-full rounded-full border border-border bg-secondary/60 pl-12 pr-28 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
          />
          {showSuggestions && (input.trim() || history.length > 0) && <div className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            {input.trim() ? (suggestionLoading ? <p className="p-4 text-sm text-muted-foreground">Searching…</p> : suggestions.length > 0 ? suggestions.map((item) => <button key={item.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setShowSuggestions(false); router.push(`/anime/${item.id}`) }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-secondary"><span className="line-clamp-1 font-medium">{item.title}</span>{item.year && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{item.year}</span>}</button>) : <p className="p-4 text-sm text-muted-foreground">No matching anime.</p>) : <div className="p-2"><div className="flex items-center justify-between px-2 py-1"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent searches</span><button type="button" onClick={clearHistory} className="text-xs text-primary hover:underline">Clear</button></div>{history.map((item) => <div key={item} className="flex items-center gap-2"><button type="button" onClick={() => { setInput(item); setShowSuggestions(false); router.push(`/search?q=${encodeURIComponent(item)}`) }} className="flex-1 px-2 py-2 text-left text-sm hover:text-primary">{item}</button><button type="button" aria-label={`Remove ${item}`} onClick={() => removeSearch(item)} className="px-2 text-muted-foreground hover:text-primary">×</button></div>)}</div>}
          </div>}
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
