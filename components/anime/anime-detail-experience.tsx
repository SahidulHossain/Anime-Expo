"use client"

import Link from "next/link"
import { useCallback, useMemo } from "react"
import useSWR from "swr"
import { ArrowLeft, Clapperboard, Layers3, Play, Star } from "lucide-react"
import type { AnimeDetail, AnimeSummary } from "@/lib/types"
import type { AnimeMetadataResponse } from "@/lib/anilist-types"
import { PosterImage } from "@/components/poster-image"
import { WatchlistButton } from "@/components/anime/watchlist-button"
import { AnimeDetailsTabs } from "@/components/anime/anime-details-tabs"
import { ShareButton } from "@/components/anime/share-button"
import { useHistory } from "@/lib/local-store"

const fetchAnimeMetadata = async (url: string): Promise<AnimeMetadataResponse> => {
  const response = await fetch(url)
  if (!response.ok) return { metadata: null, details: null }
  return response.json()
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

function validScore(value?: string) {
  if (!validText(value)) return false
  const score = Number(value)
  return Number.isFinite(score) && score > 0 && score <= 10
}

function normalizeTitle(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")
}

export function AnimeDetailExperience({ anime, related }: { anime: AnimeDetail; related: AnimeSummary[] }) {
  const metadataUrl = `/api/anime-metadata?id=${anime.id}&details=1`
  const { data, mutate } = useSWR(metadataUrl, fetchAnimeMetadata, { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 30_000 })
  const { history, hydrated } = useHistory()
  const enriched = useMemo(() => data?.metadata ? { ...anime, ...data.metadata, episodes: anime.episodes } : anime, [anime, data?.metadata])
  const refreshAiring = useCallback(async () => {
    try {
      const response = await fetch(`${metadataUrl}&refresh=1`, { cache: "no-store" })
      if (!response.ok) return
      const fresh = await response.json() as AnimeMetadataResponse
      await mutate(fresh, { revalidate: false })
    } catch {
      // Keep the current episode list usable when schedule refresh is unavailable.
    }
  }, [metadataUrl, mutate])

  const firstEpisode = enriched.episodes[0]
  const defaultType = enriched.isSub > 0 ? "sub" : "dub"
  const episodeCount = validCount(enriched.episodeCount) ?? (enriched.episodes.length > 0 ? String(enriched.episodes.length) : undefined)
  const rating = validScore(enriched.score) ? enriched.score : undefined
  const alternativeTitle = [enriched.titleRomaji, enriched.titleJapanese, ...(enriched.alternativeTitles ?? [])]
    .find((title) => validText(title) && normalizeTitle(title) !== normalizeTitle(enriched.title))
  const mainStudio = data?.details?.studios.find((studio) => studio.isMain)
  const resumeEntry = hydrated ? history.find((entry) => entry.animeId === enriched.id) : undefined
  const resumeEpisode = resumeEntry ? enriched.episodes.find((episode) => episode.id === resumeEntry.episodeId) : undefined
  const resumeProgress = resumeEntry && Number.isFinite(resumeEntry.progress) && resumeEntry.progress >= 0 && resumeEntry.progress <= 1 ? Math.round(resumeEntry.progress * 100) : 0
  const resumeHref = resumeEntry && resumeEpisode ? `/watch/${enriched.id}/${resumeEpisode.id}?type=${resumeEntry.type}` : undefined

  return <main className="overflow-x-clip bg-background pb-24 sm:pb-28">
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden sm:h-[42rem]">
        {enriched.banner || enriched.poster ? <img src={enriched.banner || enriched.poster} alt="" aria-hidden className="h-full w-full object-cover object-[58%_center] opacity-85 sm:object-center" /> : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 pb-2 pt-[calc(var(--site-header-height)+env(safe-area-inset-top)+0.75rem)] sm:pb-4 sm:px-6">
        <div className="mb-4 flex min-h-11 items-center justify-between sm:mb-6" role="group" aria-label="Anime actions"><Link href="/" aria-label="Back home" className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="size-5" /></Link><ShareButton animeId={enriched.id} title={enriched.title} /></div>
        <div className="details-hero mt-7 flex min-w-0 items-end gap-3 sm:mt-10 sm:gap-7">
          <div className="w-[5.5rem] shrink-0 sm:w-40"><PosterImage src={enriched.poster} alt={enriched.title} className="aspect-[2/3] rounded-xl border border-white/15 shadow-2xl shadow-black/60" /></div>
          <div className="min-w-0 flex-1 pb-0.5 sm:pb-1"><p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-primary sm:text-[11px]">Anime details</p><h1 className="text-balance text-xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">{enriched.title}</h1>
            {validText(alternativeTitle) && <p className="mt-1 truncate text-xs text-white/60 sm:text-sm">{alternativeTitle}</p>}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-white/75 sm:gap-x-4 sm:text-sm">{rating && <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-primary text-primary" />{rating}<span className="text-[10px] text-white/50">{validText(enriched.ratingSource) ? enriched.ratingSource : "AnimExpo"}</span></span>}{validYear(enriched.year) && <span>{enriched.year}</span>}{validText(enriched.type) && <span className="inline-flex items-center gap-1"><Clapperboard className="size-3.5 text-primary" />{enriched.type}</span>}{episodeCount && <span className="inline-flex items-center gap-1"><Layers3 className="size-3.5 text-primary" />{episodeCount} eps</span>}{typeof enriched.aniListPopularity === "number" && enriched.aniListPopularity > 0 && <span>{new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(enriched.aniListPopularity)} members</span>}</div>
            {mainStudio && <a href={`https://anilist.co/search/studios?search=${encodeURIComponent(mainStudio.name)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10px] font-medium text-white/75 transition-colors hover:border-primary/50 hover:text-white sm:text-xs"><span className="size-1.5 shrink-0 rounded-full bg-primary" />{mainStudio.name}</a>}
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">{firstEpisode && <Link href={`/watch/${enriched.id}/${firstEpisode.id}?type=${defaultType}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-red-700 to-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-950/40 transition-[filter,transform] hover:brightness-110 active:scale-[0.98] sm:px-5 sm:text-sm"><Play className="size-4 fill-current" />Watch</Link>}<WatchlistButton anime={{ id: enriched.id, title: enriched.title, poster: enriched.poster }} className="min-h-10 border-white/20 bg-black/30 px-3 py-2 text-xs text-white hover:bg-white/10 sm:px-4 sm:text-sm" /></div>
          </div>
        </div>
        {resumeHref && resumeEntry && resumeEpisode && <section className="mt-2 rounded-xl border border-white/[0.09] bg-black/35 px-3 py-2 backdrop-blur-sm sm:ml-[11.5rem] sm:mt-5 sm:max-w-xl sm:px-4">
          <div className="flex items-center justify-between gap-2"><p className="min-w-0 truncate text-[11px]"><span className="font-semibold text-white">Continue watching</span><span className="text-white/55"> · Episode {resumeEpisode.number}{episodeCount ? ` of ${episodeCount}` : ""} · {resumeProgress}%</span></p><Link href={resumeHref} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-zinc-950 transition-colors hover:bg-primary hover:text-white">Continue</Link></div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label={`Episode ${resumeEpisode.number} watch progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumeProgress}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${resumeProgress}%` }} /></div>
        </section>}
        <AnimeDetailsTabs anime={enriched} related={related} details={data?.details ?? null} onRefreshAiring={refreshAiring} />
      </div>
    </section>
  </main>
}
