import type { AnimeSummary } from "@/lib/types"
import { AnimeCard } from "./anime-card"

export function AnimeCarousel({ items }: { items: AnimeSummary[] }) {
  const unique = Array.from(new Map(items.map((item) => [item.id, item])).values())
  return (
    <div className="relative -mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex snap-x snap-mandatory gap-3">
        {unique.map((anime) => (
          <div key={anime.id} className="w-[150px] shrink-0 snap-start sm:w-[175px] lg:w-[190px]">
            <AnimeCard anime={anime} />
          </div>
        ))}
      </div>
    </div>
  )
}
