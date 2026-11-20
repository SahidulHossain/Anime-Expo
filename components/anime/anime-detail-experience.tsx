"use client"

import Link from "next/link"
import { useMemo } from "react"
import useSWR from "swr"
import { ArrowLeft, Calendar, Clapperboard, ExternalLink, Layers3, Play, Star } from "lucide-react"
import type { AnimeDetail, AnimeSummary } from "@/lib/types"
import type { KitsuMetadata } from "@/lib/kitsu-types"
import { PosterImage } from "@/components/poster-image"
import { WatchlistButton } from "@/components/anime/watchlist-button"
import { AnimeDetailsTabs } from "@/components/anime/anime-details-tabs"
import { ShareButton } from "@/components/anime/share-button"

const fetchKitsu = async (url: string): Promise<{ metadata: KitsuMetadata | null }> => {
  const response = await fetch(url)
  if (!response.ok) return { metadata: null }
  return response.json()
}

function normalizeTitle(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^\p{L}\p{N}]+/gu, "")
}

function validText(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim()) && !/^(?:n\/?a|unknown|null|undefined|0)$/i.test(value.trim())
}

function validCount(value?: string) {
  if (!validText(value)) return undefined
  const count = Number(value)
  return Number.isInteger(count) && count > 0 ? String(count) : undefined
}

function validYear(value?: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= new Date().getFullYear() + 5 ? value : undefined
}

function scoreAvailable(value?: string) {
  if (!validText(value)) return false
  const score = Number(value)
  return Number.isFinite(score) && score > 0 && score <= 10
}

function mergeMetadata(anime: AnimeDetail, metadata: KitsuMetadata | null): AnimeDetail {
  if (!metadata) return anime
  const alternativeTitles = (anime.alternativeTitles?.length ? anime.alternativeTitles : metadata.alternativeTitles).filter((title) =>
    validText(title) && ![anime.title, anime.titleJapanese ?? metadata.titleJapanese, anime.titleRomaji ?? metadata.titleRomaji].some((primary) => primary && normalizeTitle(title) === normalizeTitle(primary)),
  )
  const fallback = (current: string | undefined, value: string | undefined) => validText(current) ? current : validText(value) ? value : undefined
  const scoreValue = (value?: string) => {
    if (!validText(value)) return undefined
    const score = Number(value)
    return Number.isFinite(score) && score > 0 && score <= 10 ? String(value).trim() : undefined
  }
  const genres = (values?: string[]) => values?.filter(validText) ?? []
  const poster = fallback(anime.poster, metadata.poster)
  return {
    ...anime,
    title: validText(anime.title) && anime.title !== "Untitled" ? anime.title : fallback(metadata.title, anime.title) ?? "Untitled",
    poster: poster ?? "",
    banner: fallback(anime.banner, metadata.banner),
    description: fallback(anime.description, metadata.description),
    year: validYear(anime.year) ?? validYear(metadata.year),
    status: fallback(anime.status, metadata.status),
    score: scoreValue(anime.score) ?? scoreValue(metadata.score),
    episodeCount: validCount(anime.episodeCount) ?? validCount(metadata.episodeCount),
    type: fallback(anime.type, metadata.type),
    duration: fallback(anime.duration, metadata.duration),
    genres: genres(anime.genres).length ? genres(anime.genres) : genres(metadata.genres),
    categories: genres(anime.categories).length ? genres(anime.categories) : genres(metadata.categories),
    kitsuId: fallback(anime.kitsuId, metadata.kitsuId),
    malId: fallback(anime.malId, metadata.malId),
    aniListId: fallback(anime.aniListId, metadata.aniListId),
    titleJapanese: fallback(anime.titleJapanese, metadata.titleJapanese),
    titleRomaji: fallback(anime.titleRomaji, metadata.titleRomaji),
    alternativeTitles,
    ageRating: fallback(anime.ageRating, metadata.ageRating),
    startDate: fallback(anime.startDate, metadata.startDate),
    endDate: fallback(anime.endDate, metadata.endDate),
    trailerUrl: fallback(anime.trailerUrl, metadata.trailerUrl),
    ratingSource: scoreValue(anime.score) ? (validText(anime.ratingSource) ? anime.ratingSource : "AnimExpo catalog") : scoreValue(metadata.score) ? "Kitsu" : undefined,
    popularityRank: anime.popularityRank ?? metadata.popularityRank,
    ratingRank: anime.ratingRank ?? metadata.ratingRank,
  }
}

export function AnimeDetailExperience({ anime, related }: { anime: AnimeDetail; related: AnimeSummary[] }) {
  const needsKitsu = !validText(anime.titleJapanese) || !validText(anime.ageRating) || !validText(anime.description) || !validText(anime.poster) || !validText(anime.banner) || !validText(anime.status) || !validText(anime.type) || !validCount(anime.episodeCount) || !validText(anime.duration) || !validYear(anime.year) || !scoreAvailable(anime.score) || anime.genres.length === 0
  const { data } = useSWR(needsKitsu ? `/api/kitsu-metadata?id=${anime.id}` : null, fetchKitsu, { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 30_000 })
  const enriched = useMemo(() => mergeMetadata(anime, data?.metadata ?? null), [anime, data?.metadata])
  const firstEpisode = enriched.episodes[0]
  const defaultType = enriched.isSub > 0 ? "sub" : "dub"

  const episodeCount = validCount(enriched.episodeCount) ?? (enriched.episodes.length > 0 ? String(enriched.episodes.length) : undefined)
  const rating = scoreAvailable(enriched.score) ? enriched.score : undefined
  const titleTranslation = validText(enriched.titleJapanese) ? enriched.titleJapanese : validText(enriched.titleRomaji) ? enriched.titleRomaji : undefined

  return <main className="overflow-x-clip bg-background">
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[25rem] overflow-hidden sm:h-[30rem]">
        {enriched.banner || enriched.poster ? <img src={enriched.banner || enriched.poster} alt="" aria-hidden className="h-full w-full scale-105 object-cover object-center opacity-45 blur-[1px]" /> : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/20 to-black/65" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_45%,rgba(153,27,27,0.24),transparent_55%)]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 pb-2 pt-4 sm:pb-4 sm:pt-7">
        <div className="mb-4 flex items-center justify-between sm:mb-6"><Link href="/" aria-label="Back home" className="rounded-full border border-white/15 bg-black/40 p-2.5 text-white transition-colors hover:border-primary"><ArrowLeft className="size-5" /></Link><ShareButton animeId={enriched.id} title={enriched.title} /></div>
        <div className="details-hero flex min-w-0 items-end gap-3 sm:gap-7">
          <div className="w-[5.5rem] shrink-0 sm:w-40"><PosterImage src={enriched.poster} alt={enriched.title} className="aspect-[2/3] rounded-lg border border-white/15 shadow-2xl shadow-black/60 sm:rounded-xl" /></div>
          <div className="min-w-0 flex-1 pb-0.5 sm:pb-1"><p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-primary sm:text-[11px]">Anime details</p><h1 className="text-balance text-xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">{enriched.title}</h1>
            {titleTranslation && <p className="mt-1 truncate text-xs text-white/65 sm:text-sm">{titleTranslation}</p>}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-white/75 sm:gap-x-4 sm:text-sm">{rating && <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-primary text-primary" />{rating}<span className="text-[10px] text-white/50">{validText(enriched.ratingSource) ? enriched.ratingSource : "AnimExpo catalog"}</span></span>}{validYear(enriched.year) && <span className="inline-flex items-center gap-1"><Calendar className="size-3.5 text-primary" />{enriched.year}</span>}{validText(enriched.type) && <span className="inline-flex items-center gap-1"><Clapperboard className="size-3.5 text-primary" />{enriched.type}</span>}{episodeCount && <span className="inline-flex items-center gap-1"><Layers3 className="size-3.5 text-primary" />{episodeCount} eps</span>}</div>
            {validText(enriched.status) && <p className="mt-1 text-[10px] text-white/55 sm:text-xs">{enriched.status}</p>}
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">{firstEpisode && <Link href={`/watch/${enriched.id}/${firstEpisode.id}?type=${defaultType}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-red-700 to-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-950/40 transition-[filter,transform] hover:brightness-110 active:scale-[0.98] sm:px-5 sm:text-sm"><Play className="size-4 fill-current" />Watch</Link>}<WatchlistButton anime={{ id: enriched.id, title: enriched.title, poster: enriched.poster }} className="min-h-10 border-white/20 bg-black/30 px-3 py-2 text-xs text-white hover:bg-white/10 sm:px-4 sm:text-sm" />{enriched.trailerUrl && <a href={enriched.trailerUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 sm:px-4 sm:text-sm">Trailer<ExternalLink className="size-3.5" /></a>}</div>
          </div>
        </div>
        <AnimeDetailsTabs anime={enriched} related={related} />
      </div>
    </section>
  </main>
}
