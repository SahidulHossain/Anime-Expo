import Link from "next/link"
import { Star } from "lucide-react"
import type { AnimeSummary } from "@/lib/types"
import { PosterImage } from "./poster-image"

export function AnimeCard({ anime }: { anime: AnimeSummary }) {
  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group block overflow-hidden rounded-lg border border-border/60 bg-card transition-colors hover:border-primary/60"
    >
      <div className="relative">
        <PosterImage src={anime.poster} alt={anime.title} className="aspect-[2/3]" />

        {anime.score && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
            <Star className="size-3 fill-primary text-primary" />
            {anime.score}
          </span>
        )}

        <div className="absolute bottom-2 left-2 flex gap-1">
          {anime.isSub > 0 && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
              Sub
            </span>
          )}
          {anime.isDub > 0 && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-secondary-foreground">
              Dub
            </span>
          )}
        </div>
      </div>

      <div className="p-2.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
          {anime.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {[anime.type, anime.episodeCount ? `${anime.episodeCount} eps` : null, anime.year]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>
    </Link>
  )
}

export function AnimeCardGrid({ items }: { items: AnimeSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((anime) => (
        <AnimeCard key={anime.id} anime={anime} />
      ))}
    </div>
  )
}

export function AnimeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <div className="aspect-[2/3] animate-pulse bg-secondary" />
      <div className="space-y-2 p-2.5">
        <div className="h-3.5 w-full animate-pulse rounded bg-secondary" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  )
}

export function AnimeGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <AnimeCardSkeleton key={i} />
      ))}
    </div>
  )
}
