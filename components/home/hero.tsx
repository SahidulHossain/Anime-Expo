import Link from "next/link"
import { Play, Info, Star } from "lucide-react"
import type { AnimeSummary } from "@/lib/types"

export function Hero({ anime }: { anime: AnimeSummary }) {
  const bg = anime.banner || anime.poster
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg || "/placeholder.svg"} alt="" aria-hidden className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[62vh] max-w-7xl flex-col justify-end px-4 pb-10 pt-24 sm:min-h-[70vh]">
        <span className="mb-3 inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Featured
        </span>
        <h1 className="max-w-2xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {anime.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {anime.score && (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Star className="size-4 fill-primary text-primary" />
              {anime.score}
            </span>
          )}
          {anime.year && <span>{anime.year}</span>}
          {anime.status && <span>{anime.status}</span>}
          {anime.episodeCount && <span>{anime.episodeCount} episodes</span>}
        </div>

        {anime.description && (
          <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground line-clamp-3 sm:text-base">
            {anime.description}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/anime/${anime.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="size-4 fill-current" />
            Watch Now
          </Link>
          <Link
            href={`/anime/${anime.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Info className="size-4" />
            Details
          </Link>
        </div>
      </div>
    </section>
  )
}
