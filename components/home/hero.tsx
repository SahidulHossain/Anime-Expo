"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Info, Play, Star } from "lucide-react"
import { WatchlistButton } from "@/components/anime/watchlist-button"
import type { AnimeSummary } from "@/lib/types"

export function Hero({ anime, slides = [anime] }: { anime: AnimeSummary; slides?: AnimeSummary[] }) {
  const [index, setIndex] = useState(Math.max(0, slides.findIndex((item) => item.id === anime.id)))
  const [paused, setPaused] = useState(false)
  const current = slides[index] ?? anime

  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 7000)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  return (
    <section className="relative isolate min-h-[min(660px,calc(100svh-4rem))] overflow-hidden border-b border-white/[0.06] sm:min-h-[min(700px,82svh)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute inset-0 -z-10 bg-black">
        {slides.map((slide, slideIndex) => (
          <img key={slide.id} src={slide.banner || slide.poster} alt="" aria-hidden loading={slideIndex === index ? "eager" : "lazy"} fetchPriority={slideIndex === index ? "high" : "auto"} className={`absolute inset-0 h-full w-full object-cover object-[62%_center] transition-opacity duration-700 sm:object-center ${slideIndex === index ? "hero-backdrop opacity-70" : "opacity-0"}`} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/15 sm:from-black/90 sm:via-black/55 sm:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-black/15" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/45 to-transparent" />
      </div>

      <div className="mx-auto flex min-h-[min(660px,calc(100svh-4rem))] max-w-7xl flex-col justify-end px-4 pb-10 pt-16 sm:min-h-[min(700px,82svh)] sm:px-6 sm:pb-16">
        <div key={current.id} className="hero-copy mb-7 max-w-2xl sm:mb-8">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.3em] text-primary sm:text-xs">Featured anime</p>
          <h1 className="line-clamp-3 text-balance text-[2rem] font-black leading-[1.08] tracking-tight text-white sm:text-6xl">{current.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-white/75 sm:text-sm">
            {current.score && <span className="inline-flex items-center gap-1 font-bold text-white"><Star className="size-4 fill-primary text-primary" />{current.score}</span>}
            {current.year && <span>{current.year}</span>}
            {current.type && <span>{current.type}</span>}
            {current.episodeCount && <span>{current.episodeCount} episodes</span>}
          </div>
          {current.genres.length > 0 && <p className="mt-3 text-sm text-white/70">{current.genres.slice(0, 4).join("  •  ")}</p>}
          {current.description && <p className="mt-3 line-clamp-1 max-w-xl text-xs leading-relaxed text-white/65 sm:line-clamp-2 sm:text-sm">{current.description}</p>}
          <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
            <Link href={`/anime/${current.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] motion-reduce:transform-none"><Play className="size-4 fill-current" />Watch now</Link>
            <WatchlistButton anime={{ id: current.id, title: current.title, poster: current.poster }} className="min-h-11 rounded-xl border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white backdrop-blur-sm hover:bg-white/15" />
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
