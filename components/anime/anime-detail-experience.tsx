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

function mergeMetadata(anime: AnimeDetail, metadata: KitsuMetadata | null): AnimeDetail {
  if (!metadata) return anime
  const alternativeTitles = (anime.alternativeTitles?.length ? anime.alternativeTitles : metadata.alternativeTitles).filter((title) =>
    ![anime.title, anime.titleJapanese ?? metadata.titleJapanese, anime.titleRomaji ?? metadata.titleRomaji].some((primary) => primary && normalizeTitle(title) === normalizeTitle(primary)),
  )
  const fallback = (current: string | undefined, value: string | undefined) => {
    const normalized = current?.trim()
    return normalized && !/^(?:n\/?a|unknown|null|undefined)$/i.test(normalized) ? current : value
  }
  return {
    ...anime,
    title: anime.title && anime.title !== "Untitled" ? anime.title : metadata.title ?? anime.title,
    poster: fallback(anime.poster, metadata.poster) ?? "",
    banner: fallback(anime.banner, metadata.banner),
    description: fallback(anime.description, metadata.description),
    year: anime.year ?? metadata.year,
    status: fallback(anime.status, metadata.status),
    score: fallback(anime.score, metadata.score),
    episodeCount: fallback(anime.episodeCount, metadata.episodeCount),
    type: fallback(anime.type, metadata.type),
    duration: fallback(anime.duration, metadata.duration),
    genres: anime.genres.length ? anime.genres : metadata.genres,
    categories: anime.categories?.length ? anime.categories : metadata.categories,
    kitsuId: anime.kitsuId ?? metadata.kitsuId,
    malId: anime.malId ?? metadata.malId,
    aniListId: anime.aniListId ?? metadata.aniListId,
    titleJapanese: anime.titleJapanese ?? metadata.titleJapanese,
    titleRomaji: anime.titleRomaji ?? metadata.titleRomaji,
    alternativeTitles,
    ageRating: anime.ageRating ?? metadata.ageRating,
    startDate: anime.startDate ?? metadata.startDate,
    endDate: anime.endDate ?? metadata.endDate,
    trailerUrl: anime.trailerUrl ?? metadata.trailerUrl,
    ratingSource: anime.ratingSource ?? (anime.score ? "AnimExpo catalog" : metadata.score ? "Kitsu" : undefined),
    popularityRank: anime.popularityRank ?? metadata.popularityRank,
    ratingRank: anime.ratingRank ?? metadata.ratingRank,
  }
}

export function AnimeDetailExperience({ anime, related }: { anime: AnimeDetail; related: AnimeSummary[] }) {
  const needsKitsu = !anime.kitsuId || !anime.titleJapanese || !anime.ageRating || !anime.description || !anime.poster || !anime.banner || !anime.status || !anime.type || !anime.episodeCount || !anime.duration || !anime.year || !anime.score || anime.genres.length === 0
  const { data } = useSWR(needsKitsu ? `/api/kitsu-metadata?id=${anime.id}` : null, fetchKitsu, { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 30_000 })
  const enriched = useMemo(() => mergeMetadata(anime, data?.metadata ?? null), [anime, data?.metadata])
  const firstEpisode = enriched.episodes[0]
  const defaultType = enriched.isSub > 0 ? "sub" : "dub"

  return <main className="min-h-screen bg-background">
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] overflow-hidden sm:h-[38rem]">
        {enriched.banner || enriched.poster ? <img src={enriched.banner || enriched.poster} alt="" aria-hidden className="h-full w-full scale-105 object-cover object-center opacity-45 blur-[1px]" /> : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/20 to-black/65" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_45%,rgba(153,27,27,0.24),transparent_55%)]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 pb-2 pt-4 sm:pb-4 sm:pt-7">
        <div className="mb-5 flex items-center justify-between sm:mb-7"><Link href="/" aria-label="Back home" className="rounded-full border border-white/15 bg-black/40 p-2.5 text-white transition-colors hover:border-primary"><ArrowLeft className="size-5" /></Link><ShareButton animeId={enriched.id} title={enriched.title} /></div>
        <div className="details-hero flex items-end gap-3 sm:gap-7">
          <div className="w-24 shrink-0 sm:w-44"><PosterImage src={enriched.poster} alt={enriched.title} className="aspect-[2/3] rounded-lg border border-white/15 shadow-2xl shadow-black/60 sm:rounded-xl" /></div>
          <div className="min-w-0 flex-1 pb-0.5 sm:pb-1"><p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-primary sm:text-[11px]">Anime details</p><h1 className="text-balance text-xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">{enriched.title}</h1>
            {(enriched.titleJapanese || enriched.titleRomaji) && <p className="mt-1 text-xs text-white/65 sm:text-sm">{enriched.titleJapanese || enriched.titleRomaji}</p>}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-white/75 sm:gap-x-4 sm:text-sm">{enriched.score && <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-primary text-primary" />{enriched.score}<span className="text-[10px] text-white/50">{enriched.ratingSource || "AnimExpo catalog"}</span></span>}{enriched.year && <span className="inline-flex items-center gap-1"><Calendar className="size-3.5 text-primary" />{enriched.year}</span>}{enriched.type && <span className="inline-flex items-center gap-1"><Clapperboard className="size-3.5 text-primary" />{enriched.type}</span>}{(enriched.episodeCount || enriched.episodes.length > 0) && <span className="inline-flex items-center gap-1"><Layers3 className="size-3.5 text-primary" />{enriched.episodeCount || enriched.episodes.length} eps</span>}</div>
            {enriched.status && <p className="mt-1 text-[10px] text-white/55 sm:text-xs">{enriched.status}</p>}
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">{firstEpisode && <Link href={`/watch/${enriched.id}/${firstEpisode.id}?type=${defaultType}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-red-700 to-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-950/40 transition-[filter,transform] hover:brightness-110 active:scale-[0.98] sm:px-5 sm:text-sm"><Play className="size-4 fill-current" />Watch</Link>}<WatchlistButton anime={{ id: enriched.id, title: enriched.title, poster: enriched.poster }} className="min-h-10 border-white/20 bg-black/30 px-3 py-2 text-xs text-white hover:bg-white/10 sm:px-4 sm:text-sm" />{enriched.trailerUrl && <a href={enriched.trailerUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 sm:px-4 sm:text-sm">Trailer<ExternalLink className="size-3.5" /></a>}</div>
          </div>
        </div>
        <AnimeDetailsTabs anime={enriched} related={related} />
      </div>
    </section>
  </main>
}
