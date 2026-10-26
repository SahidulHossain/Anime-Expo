"use client"

import { useMemo, useState } from "react"
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
  const seasons = related.filter((item) => item.title.toLowerCase().startsWith(franchiseName.toLowerCase()) && item.type?.toLowerCase() !== "movie")
  const movies = related.filter((item) => item.title.toLowerCase().startsWith(franchiseName.toLowerCase()) && ["movie", "film"].includes(item.type?.trim().toLowerCase() || ""))
  const similar = related.filter((item) => item.id !== anime.id && item.genres.some((genre) => anime.genres.includes(genre))).sort((a, b) => b.genres.filter((g) => anime.genres.includes(g)).length - a.genres.filter((g) => anime.genres.includes(g)).length || Number(b.score || 0) - Number(a.score || 0)).slice(0, 12)
  const description = anime.description ?? "No synopsis is available for this title yet."

  return (
    <section className="mt-8 pb-12">
      <div className="flex border-b border-white/10" role="tablist" aria-label="Anime details">
        {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={active === tab} onClick={() => setActive(tab)} className={cn("border-b-2 px-4 py-3 text-sm font-semibold transition-colors", active === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white")}>{tab}</button>)}
      </div>

      <div className="pt-6">
        {active === "Home" && <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Info className="size-4 text-primary" />Synopsis</h2>
            <p className={cn("text-sm leading-7 text-muted-foreground", !expanded && "line-clamp-4")}>{description}</p>
            {description.length > 320 && <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-primary">{expanded ? "Less" : "More"}</button>}
          </div>
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <InfoRow label="Status" value={anime.status || "Unavailable"} />
            <InfoRow label="Format" value={anime.type || "Unavailable"} />
            <InfoRow label="Release year" value={String(anime.year || "Unavailable")} />
            <InfoRow label="Episodes" value={anime.episodeCount || String(anime.episodes.length)} />
            <InfoRow label="Studio" value="Unavailable" />
            <InfoRow label="Members" value="Unavailable" />
          </dl>
          <div className="lg:col-span-2 flex flex-wrap gap-2">{anime.genres.map((genre) => <a key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary">{genre}</a>)}</div>
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
function RelatedSection({ title, items }: { title: string; items: AnimeSummary[] }) { return <div><h2 className="mb-3 text-lg font-bold">{title}</h2><AnimeCarousel items={items} /></div> }
function EmptyState() { return <div className="rounded-2xl border border-white/10 p-8 text-center text-sm text-muted-foreground">No related anime is available.</div> }
