"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { AnimeSummary } from "@/lib/types"
import { AnimeCard } from "./anime-card"

export function AnimeCarousel({ items }: { items: AnimeSummary[] }) {
  const unique = Array.from(new Map(items.map((item) => [item.id, item])).values())
  const scroller = useRef<HTMLDivElement>(null)
  const scroll = (direction: number) => scroller.current?.scrollBy({ left: direction * 420, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })

  return (
    <div className="group relative">
      <div ref={scroller} className="relative -mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3 motion-reduce:snap-none">
        {unique.map((anime, index) => (
          <div key={anime.id} className="w-[150px] shrink-0 snap-start sm:w-[175px] lg:w-[190px]">
            <AnimeCard anime={anime} priority={index < 6} />
          </div>
        ))}
        </div>
      </div>
      {unique.length > 4 && <>
        <button type="button" onClick={() => scroll(-1)} aria-label="Previous anime" className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/70 p-2 text-white opacity-0 transition group-hover:opacity-100 md:block"><ChevronLeft className="size-4" /></button>
        <button type="button" onClick={() => scroll(1)} aria-label="Next anime" className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/70 p-2 text-white opacity-0 transition group-hover:opacity-100 md:block"><ChevronRight className="size-4" /></button>
      </>}
    </div>
  )
}
