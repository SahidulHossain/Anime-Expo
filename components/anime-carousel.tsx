"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { AnimeSummary } from "@/lib/types"
import { AnimeCard } from "./anime-card"

export function AnimeCarousel({ items, priorityCount = 0 }: { items: AnimeSummary[]; priorityCount?: number }) {
  const unique = Array.from(new Map(items.map((item) => [item.id, item])).values())
  const scroller = useRef<HTMLDivElement>(null)
  const scroll = (direction: number) => scroller.current?.scrollBy({ left: direction * 420, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })

  return (
    <div className="group/carousel relative">
      <div ref={scroller} className="relative -mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-5 bg-gradient-to-r from-background to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-background to-transparent" aria-hidden />
        <div className="flex snap-x snap-mandatory gap-3 motion-reduce:snap-none">
        {unique.map((anime, index) => (
          <div key={anime.id} className="w-[150px] shrink-0 snap-start sm:w-[175px] lg:w-[190px]">
            <AnimeCard anime={anime} priority={index < priorityCount} />
          </div>
        ))}
        </div>
      </div>
      {unique.length > 4 && <>
        <button type="button" onClick={() => scroll(-1)} aria-label="Previous anime" className="absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/75 p-2.5 text-white opacity-0 shadow-lg backdrop-blur-md transition-[opacity,transform] duration-200 hover:scale-105 hover:bg-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover/carousel:opacity-100 md:block"><ChevronLeft className="size-4" /></button>
        <button type="button" onClick={() => scroll(1)} aria-label="Next anime" className="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/75 p-2.5 text-white opacity-0 shadow-lg backdrop-blur-md transition-[opacity,transform] duration-200 hover:scale-105 hover:bg-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover/carousel:opacity-100 md:block"><ChevronRight className="size-4" /></button>
      </>}
    </div>
  )
}
