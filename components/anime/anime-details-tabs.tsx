"use client"

import { useState } from "react"
import Link from "next/link"
import { Info } from "lucide-react"
import type { AnimeDetail, AnimeSummary } from "@/lib/types"
import { EpisodeList } from "./episode-list"
import { AnimeCarousel } from "@/components/anime-carousel"
import { cn } from "@/lib/utils"

const tabs = ["Home", "Episodes", "Related"] as const

export function AnimeDetailsTabs({ anime, related }: { anime: AnimeDetail; related: AnimeSummary[] }) {
  const [active, setActive] = useState<(typeof tabs)[number]>("Home")
  const [expanded, setExpanded] = useState(false)
  const similar = anime.genres.length > 0 ? related.filter((item) => {
    if (item.id === anime.id || !item.poster || !item.genres.length) return false
    const sharedGenres = item.genres.filter((genre) => anime.genres.some((animeGenre) => animeGenre.toLowerCase() === genre.toLowerCase())).length
    const sameKnownType = !anime.type || !item.type || anime.type.trim().toLowerCase() === item.type.trim().toLowerCase()
    return sharedGenres >= 2 && sameKnownType
  }).sort((a, b) => b.genres.filter((genre) => anime.genres.some((animeGenre) => animeGenre.toLowerCase() === genre.toLowerCase())).length - a.genres.filter((genre) => anime.genres.some((animeGenre) => animeGenre.toLowerCase() === genre.toLowerCase())).length || Number(b.score || 0) - Number(a.score || 0)).slice(0, 12) : []
  const description = validText(anime.description) ? anime.description.trim() : undefined
  const categories = anime.categories?.filter((category) => validText(category) && !anime.genres.some((genre) => genre.toLowerCase() === category.toLowerCase() || (genre.toLowerCase() === "sci-fi" && category.toLowerCase() === "science fiction"))) ?? []
  const information = [isValidDuration(anime.duration), validText(anime.ageRating), isValidDate(anime.startDate), isValidDate(anime.endDate), Boolean(anime.alternativeTitles?.some(validText)), categories.length > 0].some(Boolean)
  const visibleTabs = similar.length ? tabs : ["Home", "Episodes"] as const

  return (
    <section className="mt-5 pb-12 sm:mt-7">
      <div className="flex border-b border-white/10" role="tablist" aria-label="Anime details">
        {visibleTabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={active === tab} onClick={() => setActive(tab)} className={cn("relative min-h-11 px-4 py-2.5 text-xs font-semibold transition-colors after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors sm:px-5 sm:text-sm", active === tab ? "text-white after:bg-primary" : "text-muted-foreground after:bg-transparent hover:text-white")}>{tab}</button>)}
      </div>

      <div key={active} className="details-panel pt-4 sm:pt-5">
        {active === "Home" && <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {description && <div>
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold sm:text-lg"><Info className="size-4 text-primary" />Synopsis</h2>
            <p className={cn("max-w-3xl text-[13px] leading-6 text-muted-foreground sm:text-sm sm:leading-7", !expanded && "line-clamp-4")}>{description}</p>
            {description.length > 320 && <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-primary">{expanded ? "Less" : "More"}</button>}
          </div>}
          {information && <div><h2 className="mb-3 text-sm font-bold text-white sm:text-base">Information</h2><dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm sm:rounded-2xl sm:p-5">
          {isValidDuration(anime.duration) && <InfoRow label="Episode duration" value={anime.duration!} />}
          {validText(anime.ageRating) && <InfoRow label="Age rating" value={anime.ageRating!} />}
          {isValidDate(anime.startDate) && <InfoRow label="Start date" value={anime.startDate!} />}
          {isValidDate(anime.endDate) && <InfoRow label="End date" value={anime.endDate!} />}
          {anime.alternativeTitles?.filter(validText).length ? <InfoRow label="Also known as" value={anime.alternativeTitles.filter(validText).join(", ")} /> : null}
          {categories.length ? <InfoRow label="Categories" value={categories.slice(0, 6).join(", ")} /> : null}
          </dl></div>}
          {anime.genres.some(validText) && <div className="flex flex-wrap gap-2 lg:col-span-2">{anime.genres.filter(validText).map((genre) => <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary">{genre.trim()}</Link>)}</div>}
        </div>}
        {active === "Episodes" && <EpisodeList anime={anime} />}
        {active === "Related" && <div className="space-y-8">
          {similar.length > 0 && <RelatedSection title="More Like This Anime" items={similar} />}
        </div>}
      </div>
    </section>
  )
}

function validText(value?: string): value is string {
  return typeof value === "string" && Boolean(value.trim()) && !/^(?:n\/?a|unknown|null|undefined|0)$/i.test(value.trim())
}
function isValidDuration(value?: string) {
  if (!validText(value)) return false
  const amount = Number(value.match(/\d+(?:\.\d+)?/)?.[0])
  return Number.isFinite(amount) && amount > 0
}
function isValidDate(value?: string) {
  return validText(value) && /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value) && !Number.isNaN(Date.parse(value))
}
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium text-white">{value}</dd></div> }
function RelatedSection({ title, items }: { title: string; items: AnimeSummary[] }) { return <div><h2 className="mb-3 text-lg font-bold">{title}</h2><AnimeCarousel items={items} /></div> }
