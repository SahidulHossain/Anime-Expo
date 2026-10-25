"use client"

import { useMemo, useState } from "react"
import { Info } from "lucide-react"
import type { AnimeDetail, AnimeSummary } from "@/lib/types"
import { EpisodeList } from "./episode-list"
import { AnimeCarousel } from "@/components/anime-carousel"
import { PosterImage } from "@/components/poster-image"
import Link from "next/link"
import { cn } from "@/lib/utils"

const tabs = ["Home", "Episodes", "Related"] as const

export function AnimeDetailsTabs({ anime, related }: { anime: AnimeDetail; related: AnimeSummary[] }) {
  const [active, setActive] = useState<(typeof tabs)[number]>("Home")
  const [expanded, setExpanded] = useState(false)
  const seasons = related.filter((item) => item.title.toLowerCase().includes(anime.title.toLowerCase()) || anime.title.toLowerCase().includes(item.title.toLowerCase()))
  const similar = related.filter((item) => item.id !== anime.id && item.genres.some((genre) => anime.genres.includes(genre))).slice(0, 12)
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
          {seasons.length > 0 && <WatchOrder anime={anime} items={seasons.slice(0, 12)} />}
          {seasons.filter((item) => item.type?.toLowerCase() === "movie").length > 0 && <RelatedSection title="Franchise Movies" items={seasons.filter((item) => item.type?.toLowerCase() === "movie")} />}
          {similar.length > 0 && <RelatedSection title="More Like This" items={similar} />}
          {seasons.length === 0 && similar.length === 0 && <EmptyState />}
        </div>}
      </div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium text-white">{value}</dd></div> }
function RelatedSection({ title, items }: { title: string; items: AnimeSummary[] }) { return <div><h2 className="mb-3 text-lg font-bold">{title}</h2><AnimeCarousel items={items} /></div> }
function WatchOrder({ anime, items }: { anime: AnimeDetail; items: AnimeSummary[] }) {
  const entries = [{ ...anime, type: anime.type || "Current title" }, ...items.filter((item) => item.id !== anime.id)]
  return <div><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Watch Order</h2><p className="text-xs text-muted-foreground">Available franchise entries in release order</p></div></div><div className="grid gap-2 sm:grid-cols-2">{entries.map((item, index) => <Link key={item.id} href={`/anime/${item.id}`} className={cn("flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/50", item.id === anime.id ? "border-primary/60 bg-primary/5" : "border-white/10 bg-white/[0.03]")}><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">{index + 1}</span><PosterImage src={item.poster} alt="" className="size-12 shrink-0 rounded-lg" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="text-xs text-muted-foreground">{item.type || "Title"}{item.year ? ` · ${item.year}` : ""}</span>{item.id === anime.id && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-primary">You are here</span>}</span></Link>)}</div></div> }
function EmptyState() { return <div className="rounded-2xl border border-white/10 p-8 text-center text-sm text-muted-foreground">No related anime is available.</div> }
