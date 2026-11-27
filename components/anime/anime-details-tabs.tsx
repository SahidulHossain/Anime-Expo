"use client"

import { useState } from "react"
import Link from "next/link"
import { Info } from "lucide-react"
import type { AnimeDetail, AnimeSummary } from "@/lib/types"
import type { AniListDetails } from "@/lib/anilist-types"
import { AniListCharacters, AniListFranchise, AniListProduction, AniListRecommendations, AniListTags, AniListTrailer } from "./anilist-details-sections"
import { EpisodeList } from "./episode-list"
import { AnimeCarousel } from "@/components/anime-carousel"
import { cn } from "@/lib/utils"

type DetailTab = "Home" | "Episodes" | "Characters" | "Franchise" | "Related"

export function AnimeDetailsTabs({ anime, related, details }: { anime: AnimeDetail; related: AnimeSummary[]; details: AniListDetails | null }) {
  const [active, setActive] = useState<DetailTab>("Home")
  const [expanded, setExpanded] = useState(false)
  const similar = anime.genres.length > 0 ? related.filter((item) => {
    if (item.id === anime.id || !item.poster || !item.genres.length) return false
    const sharedGenres = item.genres.filter((genre) => anime.genres.some((animeGenre) => animeGenre.toLowerCase() === genre.toLowerCase())).length
    const sameKnownType = !anime.type || !item.type || anime.type.trim().toLowerCase() === item.type.trim().toLowerCase()
    return sharedGenres >= 2 && sameKnownType
  }).sort((a, b) => b.genres.filter((genre) => anime.genres.some((animeGenre) => animeGenre.toLowerCase() === genre.toLowerCase())).length - a.genres.filter((genre) => anime.genres.some((animeGenre) => animeGenre.toLowerCase() === genre.toLowerCase())).length || Number(b.score || 0) - Number(a.score || 0)).slice(0, 12) : []
  const recommendations = details?.recommendations ?? []
  const recommendationTitles = new Set(recommendations.map((item) => normalizeTitle(item.title)))
  const uniqueSimilar = similar.filter((item) => ![item.title, ...(item.alternativeTitles ?? [])].some((title) => recommendationTitles.has(normalizeTitle(title))))
  const relations = details?.relations ?? []
  const characters = details?.characters ?? []
  const hasProduction = Boolean(details?.studios.length || details?.staff.length)
  const hasThemes = Boolean(details?.tags.some((tag) => (tag.rank ?? 0) >= 45 && !tag.isMediaSpoiler && !tag.isGeneralSpoiler))
  const description = validText(anime.description) ? anime.description.trim() : undefined
  const categories = anime.categories?.filter((category) => validText(category) && !anime.genres.some((genre) => genre.toLowerCase() === category.toLowerCase() || (genre.toLowerCase() === "sci-fi" && category.toLowerCase() === "science fiction"))) ?? []
  const showAniListStats = [anime.aniListMeanScore, anime.aniListPopularity, anime.aniListFavourites, anime.aniListTrending].some((value) => typeof value === "number" && value > 0)
  const information = [isValidDuration(anime.duration), validText(anime.ageRating), isValidDate(anime.startDate), isValidDate(anime.endDate), Boolean(anime.alternativeTitles?.some(validText)), categories.length > 0, validText(anime.season), validText(anime.countryOfOrigin), showAniListStats, Boolean(details?.rankings.length), Boolean(details?.scoreDistribution.length), Boolean(details?.officialLinks.length), validText(anime.aniListUrl)].some(Boolean)
  const visibleTabs: DetailTab[] = ["Home", "Episodes"]
  if (characters.length) visibleTabs.push("Characters")
  if (relations.length) visibleTabs.push("Franchise")
  if (uniqueSimilar.length || recommendations.length) visibleTabs.push("Related")
  const featuredRank = details?.rankings.filter((item) => item.type === "RATED" || item.type === "POPULAR").sort((a, b) => a.rank - b.rank)[0]
  const topScores = details?.scoreDistribution.slice().sort((a, b) => b.amount - a.amount).slice(0, 3) ?? []

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
          {(validText(anime.season) || anime.seasonYear) && <InfoRow label="Release season" value={[anime.season, anime.seasonYear].filter(Boolean).join(" ")} />}
          {validText(anime.countryOfOrigin) && /^[A-Z]{2}$/.test(anime.countryOfOrigin) && <InfoRow label="Country of origin" value={anime.countryOfOrigin} />}
          {validText(anime.sourceType) && <InfoRow label="Source material" value={anime.sourceType.replaceAll("_", " ").toLowerCase()} />}
          {typeof anime.aniListMeanScore === "number" && anime.aniListMeanScore > 0 && anime.aniListMeanScore <= 100 && <InfoRow label="AniList mean score" value={`${(anime.aniListMeanScore / 10).toFixed(1)} / 10`} />}
          {typeof anime.aniListPopularity === "number" && anime.aniListPopularity > 0 && <InfoRow label="AniList popularity" value={formatCount(anime.aniListPopularity)} />}
          {typeof anime.aniListFavourites === "number" && anime.aniListFavourites > 0 && <InfoRow label="AniList favourites" value={formatCount(anime.aniListFavourites)} />}
          {typeof anime.aniListTrending === "number" && anime.aniListTrending > 0 && <InfoRow label="AniList trending" value={formatCount(anime.aniListTrending)} />}
          {featuredRank && <InfoRow label="AniList ranking" value={`#${featuredRank.rank} · ${featuredRank.context}`} />}
          {anime.alternativeTitles?.filter(validText).length ? <InfoRow label="Also known as" value={anime.alternativeTitles.filter(validText).join(", ")} /> : null}
          {categories.length ? <InfoRow label="Categories" value={categories.slice(0, 6).join(", ")} /> : null}
          </dl>
          {topScores.length > 0 && <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"><h3 className="text-xs font-semibold text-white">AniList score distribution</h3><ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{topScores.map((item) => <li key={item.score} className="text-xs text-muted-foreground">{(item.score / 10).toFixed(1)}/10 · {formatCount(item.amount)} votes</li>)}</ul></div>}
          {(validText(anime.aniListUrl) || details?.officialLinks.length) && <div className="mt-3 flex flex-wrap gap-2">{validText(anime.aniListUrl) && <ExternalResourceLink href={anime.aniListUrl} label="AniList" />}{details?.officialLinks.map((link) => <ExternalResourceLink key={`${link.site}-${link.url}`} href={link.url} label={link.site} />)}</div>}
          </div>}
          {anime.genres.some(validText) && <div className="flex flex-wrap gap-2 lg:col-span-2">{anime.genres.filter(validText).map((genre) => <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary">{genre.trim()}</Link>)}</div>}
        </div>}
        {active === "Home" && details && (hasProduction || hasThemes || details.trailer) && <div className="mt-6 grid gap-5 lg:grid-cols-2">{hasProduction && <AniListProduction details={details} />}{hasThemes && <AniListTags tags={details.tags} />}{details.trailer && <AniListTrailer details={details} title={anime.title} />}</div>}
        {active === "Episodes" && <EpisodeList anime={anime} />}
        {active === "Characters" && <AniListCharacters characters={characters} />}
        {active === "Franchise" && <div className="space-y-3"><h2 className="text-lg font-bold">Franchise relationships</h2><AniListFranchise relations={relations} /></div>}
        {active === "Related" && <div className="space-y-8">
          {recommendations.length > 0 && <div className="space-y-3"><h2 className="text-lg font-bold">AniList recommendations</h2><AniListRecommendations recommendations={recommendations} /></div>}
          {uniqueSimilar.length > 0 && <RelatedSection title="More Like This" items={uniqueSimilar} />}
        </div>}
      </div>
    </section>
  )
}

function normalizeTitle(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^\p{L}\p{N}]+/gu, "")
}
function formatCount(value: number) { return new Intl.NumberFormat("en").format(value) }
function ExternalResourceLink({ href, label }: { href: string; label: string }) { return <a href={href} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary">{label}</a> }
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
