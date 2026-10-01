import { notFound } from "next/navigation"
import Link from "next/link"
import { Play, Star, Calendar, Radio, Clapperboard } from "lucide-react"
import { getAnimeDetail } from "@/lib/anime-api"
import { PosterImage } from "@/components/poster-image"
import { WatchlistButton } from "@/components/anime/watchlist-button"
import { EpisodeList } from "@/components/anime/episode-list"

export const revalidate = 600

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const anime = await getAnimeDetail(id)
  if (!anime) return { title: "Not found — ANIME EXPO" }
  return {
    title: `${anime.title} — ANIME EXPO`,
    description: anime.description?.slice(0, 160) ?? `Watch ${anime.title} online.`,
  }
}

export default async function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const anime = await getAnimeDetail(id)
  if (!anime) notFound()

  const firstEpisode = anime.episodes[0]
  const defaultType = anime.isSub > 0 ? "sub" : "dub"
  const meta = [
    anime.type && { icon: Clapperboard, label: anime.type },
    anime.year && { icon: Calendar, label: String(anime.year) },
    anime.status && { icon: Radio, label: anime.status },
    anime.score && { icon: Star, label: anime.score },
  ].filter(Boolean) as { icon: typeof Star; label: string }[]

  return (
    <main>
      {/* Banner backdrop */}
      <div className="relative">
        <div className="absolute inset-0 h-72 overflow-hidden sm:h-96">
          {anime.banner || anime.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={anime.banner || anime.poster || "/placeholder.svg"}
              alt=""
              aria-hidden
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-24 sm:pt-40">
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
            <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-56">
              <PosterImage
                src={anime.poster}
                alt={anime.title}
                className="aspect-[2/3] rounded-xl border border-border/60 shadow-xl"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-balance text-2xl font-extrabold tracking-tight sm:text-4xl">{anime.title}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {meta.map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <Icon className="size-4 text-primary" />
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {anime.isSub > 0 && (
                  <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold uppercase text-primary-foreground">
                    Sub
                  </span>
                )}
                {anime.isDub > 0 && (
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold uppercase text-secondary-foreground">
                    Dub
                  </span>
                )}
                {anime.rating && (
                  <span className="rounded border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {anime.rating}
                  </span>
                )}
              </div>

              {anime.genres.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {anime.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {firstEpisode && (
                  <Link
                    href={`/watch/${anime.id}/${firstEpisode.id}?type=${defaultType}`}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Play className="size-4 fill-current" />
                    Watch Now
                  </Link>
                )}
                <WatchlistButton anime={{ id: anime.id, title: anime.title, poster: anime.poster }} />
              </div>
            </div>
          </div>

          {anime.description && (
            <div className="mt-8">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold tracking-tight">
                <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
                Synopsis
              </h2>
              <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
                {anime.description}
              </p>
            </div>
          )}

          <div className="mt-8 pb-12">
            <EpisodeList anime={anime} />
          </div>
        </div>
      </div>
    </main>
  )
}
