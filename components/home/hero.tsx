"use client"

import Link from "next/link"
import useSWR from "swr"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Info, Play, Star } from "lucide-react"
import { WatchlistButton } from "@/components/anime/watchlist-button"
import type { AnimeSummary } from "@/lib/types"
import type { AnimeMetadataResponse } from "@/lib/anilist-types"
import { hasMissingExternalFields } from "@/lib/anime-metadata-merge"

const fetchAnimeMetadata = async (url: string): Promise<AnimeMetadataResponse> => {
  const response = await fetch(url)
  if (!response.ok) return { metadata: null, details: null }
  return response.json()
}

export function Hero({ anime, slides = [anime] }: { anime: AnimeSummary; slides?: AnimeSummary[] }) {
  const [index, setIndex] = useState(Math.max(0, slides.findIndex((item) => item.id === anime.id)))
  const [paused, setPaused] = useState(false)
  const current = slides[index] ?? anime
  const needsEnrichment = hasMissingExternalFields(current)
  const { data: enrichment } = useSWR(needsEnrichment ? `/api/anime-metadata?id=${current.id}` : null, fetchAnimeMetadata, { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 30_000 })
  const displayMetadata = enrichment?.metadata
  const displayTitle = displayMetadata?.title || current.title
  const displayPoster = displayMetadata?.poster || current.poster
  const displayBanner = displayMetadata?.banner || current.banner
  const displayDescription = displayMetadata?.description || current.description
  const displayScore = displayMetadata?.score || current.score
  const displayRatingSource = displayMetadata?.ratingSource || current.ratingSource
  const displayGenres = displayMetadata?.genres?.length ? displayMetadata.genres : current.genres
  const displayYear = displayMetadata?.year || current.year
  const displayType = displayMetadata?.type || current.type
  const displayEpisodes = displayMetadata?.episodeCount || current.episodeCount

  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 7000)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  return (
    <section className="relative isolate min-h-[min(690px,calc(100svh-4rem))] overflow-hidden border-b border-white/[0.06] sm:min-h-[min(760px,86svh)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute inset-0 -z-10 bg-black">
        {slides.map((slide, slideIndex) => (
          <img key={slide.id} src={slide.id === current.id ? displayBanner || displayPoster : slide.banner || slide.poster} alt="" aria-hidden loading={slideIndex === index ? "eager" : "lazy"} fetchPriority={slideIndex === index ? "high" : "auto"} className={`absolute inset-0 h-full w-full object-cover object-[68%_center] transition-opacity duration-700 sm:object-center ${slideIndex === index ? "hero-backdrop opacity-90" : "opacity-0"}`} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/38 to-transparent sm:from-black/75 sm:via-black/25 sm:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/35 to-transparent" />
      </div>

      <div className="mx-auto flex min-h-[min(690px,calc(100svh-4rem))] max-w-7xl flex-col justify-end px-4 pb-10 pt-16 sm:min-h-[min(760px,86svh)] sm:px-6 sm:pb-16">
        <div key={current.id} className="hero-copy mb-7 max-w-2xl sm:mb-8">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.3em] text-primary sm:text-xs">Featured anime</p>
          <h1 className="line-clamp-3 text-balance text-[2rem] font-black leading-[1.08] tracking-tight text-white sm:text-6xl">{displayTitle}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-white/75 sm:text-sm">
            {displayScore && <span className="inline-flex items-center gap-1 font-bold text-white"><Star className="size-4 fill-primary text-primary" />{displayScore}{displayRatingSource && <span className="ml-1 text-[10px] font-medium text-white/50">{displayRatingSource}</span>}</span>}
            {displayYear && <span>{displayYear}</span>}
            {displayType && <span>{displayType}</span>}
            {displayEpisodes && <span>{displayEpisodes} episodes</span>}
          </div>
          {displayGenres.length > 0 && <p className="mt-3 text-sm text-white/70">{displayGenres.filter(Boolean).slice(0, 4).join("  •  ")}</p>}
          {displayDescription && <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-relaxed text-white/75 sm:line-clamp-2 sm:text-sm">{displayDescription}</p>}
          <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
            <Link href={`/anime/${current.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_4px_20px_rgba(229,9,20,0.35)] transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] motion-reduce:transform-none"><Play className="size-4 fill-current" />Watch now</Link>
            <WatchlistButton anime={{ id: current.id, title: displayTitle, poster: displayPoster }} className="min-h-11 rounded-xl border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white backdrop-blur-sm hover:bg-white/15" />
            <Link href={`/anime/${current.id}`} aria-label="View details" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"><Info className="size-4" />Details</Link>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5" aria-label="Featured anime slides">
            {slides.map((slide, slideIndex) => <button key={slide.id} type="button" onClick={() => setIndex(slideIndex)} aria-label={`Show ${slide.title}`} className={`h-1.5 rounded-full transition-all ${slideIndex === index ? "w-8 bg-primary" : "w-1.5 bg-white/40"}`} />)}
          </div>
          {slides.length > 1 && <div className="flex gap-2"><button type="button" onClick={() => setIndex((index - 1 + slides.length) % slides.length)} aria-label="Previous featured anime" className="rounded-full border border-white/15 bg-black/30 p-2 text-white hover:bg-white/10"><ChevronLeft className="size-4" /></button><button type="button" onClick={() => setIndex((index + 1) % slides.length)} aria-label="Next featured anime" className="rounded-full border border-white/15 bg-black/30 p-2 text-white hover:bg-white/10"><ChevronRight className="size-4" /></button></div>}
        </div>
      </div>
    </section>
  )
}
