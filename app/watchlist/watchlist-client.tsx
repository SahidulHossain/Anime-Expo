"use client"

import Link from "next/link"
import { Bookmark, X } from "lucide-react"
import { useWatchlist } from "@/lib/local-store"
import { PosterImage } from "@/components/poster-image"

export function WatchlistClient() {
  const { watchlist, hydrated, remove } = useWatchlist()

  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Watchlist</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {watchlist.length} {watchlist.length === 1 ? "title" : "titles"} saved.
      </p>

      {watchlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Bookmark className="mb-4 size-10 text-muted-foreground" />
          <p className="text-lg font-semibold">Your watchlist is empty</p>
          <p className="mb-6 text-sm text-muted-foreground">Save anime to watch later.</p>
          <Link
            href="/"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Browse anime
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {watchlist.map((anime) => (
            <div key={anime.id} className="group relative">
              <Link
                href={`/anime/${anime.id}`}
                className="block overflow-hidden rounded-lg border border-border/60 bg-card transition-colors hover:border-primary/60"
              >
                <PosterImage src={anime.poster} alt={anime.title} className="aspect-[2/3]" />
                <div className="p-2.5">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
                    {anime.title}
                  </h3>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(anime.id)}
                className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-background/85 text-foreground opacity-0 backdrop-blur-sm transition-opacity hover:text-primary group-hover:opacity-100"
                aria-label={`Remove ${anime.title} from watchlist`}
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
