"use client"

import Link from "next/link"
import { Play, X } from "lucide-react"
import { useHistory } from "@/lib/local-store"
import { PosterImage } from "@/components/poster-image"
import { SectionHeading } from "@/components/section-heading"

export function ContinueWatching() {
  const { history, hydrated, remove } = useHistory()

  if (!hydrated || history.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <SectionHeading
        title="Continue Watching"
        action={
          <Link href="/history" className="text-sm font-medium text-muted-foreground hover:text-primary">
            View all
          </Link>
        }
      />
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {history.slice(0, 12).map((h) => (
          <div key={h.animeId} className="group relative w-40 shrink-0 snap-start sm:w-48">
            <Link
              href={`/watch/${h.animeId}/${h.episodeId}?type=${h.type}`}
              className="block overflow-hidden rounded-lg border border-border/60 bg-card transition-colors hover:border-primary/60"
            >
              <div className="relative aspect-video">
                <PosterImage src={h.poster} alt={h.animeTitle} className="h-full w-full" />
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Play className="size-5 fill-current" />
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 w-full bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.max(4, Math.min(100, Math.round(h.progress * 100)))}%` }}
                  />
                </div>
              </div>
              <div className="p-2">
                <p className="line-clamp-1 text-sm font-semibold">{h.animeTitle}</p>
                <p className="text-xs text-muted-foreground">
                  Episode {h.episodeNumber} • {h.type.toUpperCase()}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => remove(h.animeId)}
              className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-background/85 text-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
              aria-label={`Remove ${h.animeTitle} from continue watching`}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
