"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Play, Search } from "lucide-react"
import type { AnimeDetail } from "@/lib/types"
import { useHistory } from "@/lib/local-store"
import { cn } from "@/lib/utils"

export function EpisodeList({ anime }: { anime: AnimeDetail }) {
  const { history, hydrated } = useHistory()
  const [filter, setFilter] = useState("")

  const lastWatched = hydrated ? history.find((h) => h.animeId === anime.id) : undefined

  const episodes = useMemo(() => {
    const q = filter.trim()
    if (!q) return anime.episodes
    return anime.episodes.filter(
      (ep) => String(ep.number).includes(q) || ep.title.toLowerCase().includes(q.toLowerCase()),
    )
  }, [anime.episodes, filter])

  const defaultType = anime.isSub > 0 ? "sub" : "dub"

  if (anime.episodes.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
        No episodes are available yet.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
          Episodes
          <span className="text-sm font-normal text-muted-foreground">({anime.episodes.length})</span>
        </h2>
        {anime.episodes.length > 8 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find episode..."
              aria-label="Find episode"
              className="h-9 w-44 rounded-full border border-border bg-secondary/60 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {episodes.map((ep) => {
          const isLast = lastWatched?.episodeId === ep.id
          return (
            <Link
              key={ep.id}
              href={`/watch/${anime.id}/${ep.id}?type=${defaultType}`}
              className={cn(
                "group flex items-center gap-3 rounded-lg border p-3 transition-colors",
                isLast
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 bg-card hover:border-primary/40 hover:bg-secondary/40",
              )}
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-bold text-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                {ep.number || "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium">{ep.title}</span>
                {isLast && <span className="text-xs text-primary">Continue watching</span>}
              </span>
              <Play className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
