"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Info, Play, Plus, Star } from "lucide-react"
import type { AnimeSummary } from "@/lib/types"

export function Hero({ anime, slides = [anime] }: { anime: AnimeSummary; slides?: AnimeSummary[] }) {
  const [index, setIndex] = useState(Math.max(0, slides.findIndex((item) => item.id === anime.id)))
  const [paused, setPaused] = useState(false)
  const current = slides[index] ?? anime

  useEffect(() => {
    if (paused || slides.length < 2) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 7000)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  return (
    <section className="relative isolate min-h-[min(720px,78dvh)] overflow-hidden border-b border-white/5" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute inset-0 -z-10 bg-black">
        {slides.map((slide, slideIndex) => (
          <img key={slide.id} src={slide.banner || slide.poster} alt="" aria-hidden className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${slideIndex === index ? "opacity-70" : "opacity-0"}`} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-black/20" />
      </div>

      <div className="mx-auto flex min-h-[min(720px,78dvh)] max-w-7xl flex-col justify-end px-4 pb-14 pt-24 sm:px-6 lg:pb-20">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-primary">Featured anime</p>
          <h1 className="line-clamp-4 text-balance text-3xl font-black leading-tight tracking-tight text-white sm:text-6xl">{current.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70">
            {current.score && <span className="inline-flex items-center gap-1 font-bold text-white"><Star className="size-4 fill-primary text-primary" />{current.score}</span>}
            {current.year && <span>{current.year}</span>}
            {current.type && <span>{current.type}</span>}
            {current.episodeCount && <span>{current.episodeCount} episodes</span>}
          </div>
          {current.genres.length > 0 && <p className="mt-3 text-sm text-white/70">{current.genres.slice(0, 4).join("  •  ")}</p>}
          {current.description && <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">{current.description}</p>}
          <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
            <Link href={`/anime/${current.id}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"><Play className="size-4 fill-current" />Watch now</Link>
            <Link href={`/anime/${current.id}`} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/15"><Plus className="size-4" />My list</Link>
            <Link href={`/anime/${current.id}`} aria-label="View details" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 hover:text-white"><Info className="size-4" />Details</Link>
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
