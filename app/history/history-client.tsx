"use client"

import Link from "next/link"
import { History as HistoryIcon, Play, X } from "lucide-react"
import { useHistory } from "@/lib/local-store"
import { PosterImage } from "@/components/poster-image"

export function HistoryClient() {
  const { history, hydrated, remove, clear } = useHistory()

  if (!hydrated) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground">
            {history.length} {history.length === 1 ? "title" : "titles"} watched.
          </p>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <HistoryIcon className="mb-4 size-10 text-muted-foreground" />
          <p className="text-lg font-semibold">No watch history yet</p>
          <p className="mb-6 text-sm text-muted-foreground">Episodes you watch will show up here.</p>
          <Link
            href="/"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start watching
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {history.map((h) => (
            <div key={h.animeId} className="group relative">
              <Link
                href={`/watch/${h.animeId}/${h.episodeId}?type=${h.type}`}
                className="flex gap-3 overflow-hidden rounded-lg border border-border/60 bg-card p-2.5 transition-colors hover:border-primary/60"
              >
                <div className="relative w-28 shrink-0">
                  <PosterImage src={h.poster} alt={h.animeTitle} className="aspect-video rounded-md" />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Play className="size-4 fill-current" />
                    </span>
                  </span>
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
                    {h.animeTitle}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Episode {h.episodeNumber} • {h.type.toUpperCase()}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(h.animeId)}
                className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-background/85 text-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                aria-label={`Remove ${h.animeTitle} from history`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
