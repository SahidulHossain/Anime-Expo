"use client"

import { Bookmark, BookmarkCheck } from "lucide-react"
import { useWatchlist, type StoredAnime } from "@/lib/local-store"
import { cn } from "@/lib/utils"

export function WatchlistButton({ anime, className }: { anime: StoredAnime; className?: string }) {
  const { isSaved, toggle, hydrated } = useWatchlist()
  const saved = hydrated && isSaved(anime.id)

  return (
    <button
      type="button"
      onClick={() => toggle(anime)}
      aria-pressed={saved}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-colors",
        saved
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-secondary/50 text-foreground hover:bg-secondary",
        className,
      )}
    >
      {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      {saved ? "In Watchlist" : "Add to Watchlist"}
    </button>
  )
}
