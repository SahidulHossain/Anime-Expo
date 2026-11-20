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
  const franchiseName = anime.title.split(/\s+[—–:-]\s+|\s+Season\s+\d+/i)[0].trim()
  const matchesFranchise = (item: AnimeSummary) => {
    const title = item.title.trim().toLowerCase()
    const base = franchiseName.toLowerCase()
    const suffix = title.slice(base.length).trim()
    return title === base || (title.startsWith(base) && /^(season|part|cour|movie|film|ova|special|\d)/i.test(suffix))
  }
  const seasons = related.filter((item) => matchesFranchise(item) && !["movie", "film"].includes(item.type?.trim().toLowerCase() || ""))
  const movies = related.filter((item) => matchesFranchise(item) && ["movie", "film"].includes(item.type?.trim().toLowerCase() || ""))
  const similar = related.filter((item) => item.id !== anime.id && item.genres.some((genre) => anime.genres.includes(genre))).sort((a, b) => b.genres.filter((g) => anime.genres.includes(g)).length - a.genres.filter((g) => anime.genres.includes(g)).length || Number(b.score || 0) - Number(a.score || 0)).slice(0, 12)
  const description = anime.description?.trim()
  const categories = anime.categories?.filter((category) => !anime.genres.some((genre) => genre.toLowerCase() === category.toLowerCase() || (genre.toLowerCase() === "sci-fi" && category.toLowerCase() === "science fiction"))) ?? []

  return (
    <section className="mt-5 pb-12 sm:mt-7">
      <div className="flex border-b border-white/10" role="tablist" aria-label="Anime details">
        {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={active === tab} onClick={() => setActive(tab)} className={cn("relative min-h-11 px-4 py-2.5 text-xs font-semibold transition-colors after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors sm:px-5 sm:text-sm", active === tab ? "text-white after:bg-primary" : "text-muted-foreground after:bg-transparent hover:text-white")}>{tab}</button>)}
      </div>

      <div key={active} className="details-panel pt-4 sm:pt-5">
        {active === "Home" && <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {description && <div>
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold sm:text-lg"><Info className="size-4 text-primary" />Synopsis</h2>
            <p className={cn("max-w-3xl text-[13px] leading-6 text-muted-foreground sm:text-sm sm:leading-7", !expanded && "line-clamp-4")}>{description}</p>
            {description.length > 320 && <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-primary">{expanded ? "Less" : "More"}</button>}
          </div>}
          {(anime.duration || anime.ageRating || anime.startDate || anime.endDate || anime.alternativeTitles?.length || categories.length) && <div><h2 className="mb-3 text-sm font-bold text-white sm:text-base">Information</h2><dl className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm sm:rounded-2xl sm:p-5">
            {anime.duration && <InfoRow label="Episode duration" value={anime.duration} />}
            {anime.ageRating && <InfoRow label="Age rating" value={anime.ageRating} />}
            {anime.startDate && <InfoRow label="Start date" value={anime.startDate} />}
            {anime.endDate && <InfoRow label="End date" value={anime.endDate} />}
            {anime.alternativeTitles?.length ? <InfoRow label="Also known as" value={anime.alternativeTitles.join(", ")} /> : null}
            {categories.length ? <InfoRow label="Categories" value={categories.slice(0, 6).join(", ")} /> : null}
          </dl></div>}
          {anime.genres.length > 0 && <div className="flex flex-wrap gap-2 lg:col-span-2">{anime.genres.map((genre) => <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary">{genre}</Link>)}</div>}
        </div>}
        {active === "Episodes" && <EpisodeList anime={anime} />}
        {active === "Related" && <div className="space-y-8">
          {seasons.length > 0 && <RelatedSection title="Seasons of the Same Anime" items={seasons} />}
          <RelatedSection title="Movies of the Same Anime" items={movies} />
          {similar.length > 0 && <RelatedSection title="More Like This Anime" items={similar} />}
          {seasons.length === 0 && movies.length === 0 && similar.length === 0 && <EmptyState />}
        </div>}
      </div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium text-white">{value}</dd></div> }
function RelatedSection({ title, items }: { title: string; items: AnimeSummary[] }) { return <div><h2 className="mb-3 text-lg font-bold">{title}</h2>{items.length > 0 ? <AnimeCarousel items={items} /> : <p className="rounded-xl border border-white/10 px-4 py-6 text-sm text-muted-foreground">No verified titles available.</p>}</div> }
function EmptyState() { return <div className="rounded-2xl border border-white/10 p-8 text-center text-sm text-muted-foreground">No related anime is available.</div> }
