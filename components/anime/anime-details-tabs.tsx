"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Info, Star } from "lucide-react"
import type { AnimeDetail, AnimeSummary } from "@/lib/types"
import type { AniListDetails } from "@/lib/anilist-types"
import { AniListCharacters, AniListFranchise, AniListRecommendations, AniListTrailer } from "./anilist-details-sections"
import { EpisodeList } from "./episode-list"
import { AnimeCarousel } from "@/components/anime-carousel"
import { cn } from "@/lib/utils"

type DetailTab = "Home" | "Episodes" | "Info" | "Related"

export function AnimeDetailsTabs({ anime, related, details, onRefreshAiring }: { anime: AnimeDetail; related: AnimeSummary[]; details: AniListDetails | null; onRefreshAiring: () => Promise<void> }) {
  const [active, setActive] = useState<DetailTab>("Home")
  const [expanded, setExpanded] = useState(false)
  const recommendations = details?.recommendations ?? []
  const recommendationTitles = new Set(recommendations.map((item) => normalizeTitle(item.title)))
  const similar = anime.genres.length > 0 ? related.filter((item) => {
    if (item.id === anime.id || !item.poster || !item.genres.length) return false
    const sharedGenres = item.genres.filter((genre) => anime.genres.some((animeGenre) => normalizeTitle(animeGenre) === normalizeTitle(genre))).length
    const sameKnownType = !anime.type || !item.type || anime.type.trim().toLowerCase() === item.type.trim().toLowerCase()
    return sharedGenres >= 2 && sameKnownType
  }).sort((a, b) => b.genres.filter((genre) => anime.genres.some((animeGenre) => normalizeTitle(animeGenre) === normalizeTitle(genre))).length - a.genres.filter((genre) => anime.genres.some((animeGenre) => normalizeTitle(animeGenre) === normalizeTitle(genre))).length || Number(b.score || 0) - Number(a.score || 0)).slice(0, 12) : []
  const uniqueSimilar = similar.filter((item) => ![item.title, ...(item.alternativeTitles ?? [])].some((title) => recommendationTitles.has(normalizeTitle(title))))
  const relations = uniqueRelations(details?.relations ?? [])
  const description = validText(anime.description) ? anime.description.trim() : undefined
  const genres = uniqueStrings(anime.genres)
  const airing = details?.airingStatus === "RELEASING" ? details.nextAiringEpisode : undefined
  const tabs: DetailTab[] = ["Home", "Episodes", "Info", "Related"]

  return (
    <section className="mt-5 pb-12 sm:mt-7">
      <div className="flex justify-center overflow-x-auto pb-1" role="tablist" aria-label="Anime details">
        <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-white/[0.08] bg-black/35 p-1 backdrop-blur-sm">
          {tabs.map((tab) => <button key={tab} id={`${tab.toLowerCase()}-tab`} type="button" role="tab" aria-controls={`${tab.toLowerCase()}-panel`} aria-selected={active === tab} onClick={() => setActive(tab)} className={cn("min-h-11 rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:px-5 sm:text-sm", active === tab ? "bg-white text-zinc-950" : "text-white/55 hover:text-white")}>{tab}</button>)}
        </div>
      </div>

      <div key={active} id={`${active.toLowerCase()}-panel`} role="tabpanel" aria-labelledby={`${active.toLowerCase()}-tab`} tabIndex={0} className="details-panel pt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:pt-6">
        {active === "Home" && <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Essential anime information">
            <Essential label="Status" value={compactStatus(anime.status)} />
            <Essential label="Format" value={validText(anime.type) ? anime.type : undefined} />
            <Essential label="Year" value={validYear(anime.year) ? String(anime.year) : undefined} />
            <Essential label="Episode length" value={validText(anime.duration) ? anime.duration : undefined} />
          </div>
          {airing && <EpisodeCountdown episode={airing.episode} airingAt={airing.airingAt} onExpired={onRefreshAiring} />}
          {genres.length > 0 && <div className="flex flex-wrap gap-2">{genres.map((genre) => <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-primary/50 hover:text-primary">{genre}</Link>)}</div>}
          {description && <section>
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold sm:text-lg"><Info className="size-4 text-primary" />Synopsis</h2>
            <p className={cn("max-w-3xl whitespace-pre-line text-[13px] leading-6 text-white/65 sm:text-sm sm:leading-7", !expanded && "line-clamp-4")}>{description}</p>
            {description.length > 320 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-primary hover:text-red-300">{expanded ? "Show less" : "Show more"}</button>}
          </section>}
          {details && hasValidTrailer(details) && <section className="space-y-3"><h2 className="text-base font-bold sm:text-lg">Trailer</h2><AniListTrailer details={details} title={anime.title} /></section>}
        </div>}
        {active === "Episodes" && <EpisodeList anime={anime} />}
        {active === "Info" && <AnimeInfo anime={anime} details={details} />}
        {active === "Related" && <div className="space-y-8">
          {relations.length > 0 && <section className="space-y-3"><h2 className="text-base font-bold sm:text-lg">Franchise connections</h2><AniListFranchise relations={relations} catalog={related} /></section>}
          {recommendations.length > 0 && <section className="space-y-3"><h2 className="text-base font-bold sm:text-lg">AniList recommendations</h2><AniListRecommendations recommendations={recommendations} catalog={related} /></section>}
          {uniqueSimilar.length > 0 && <section><h2 className="mb-3 text-base font-bold sm:text-lg">More like this</h2><AnimeCarousel items={uniqueSimilar} /></section>}
          {!relations.length && !recommendations.length && !uniqueSimilar.length && <p className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5 text-sm text-white/55">Related anime information is not available yet.</p>}
        </div>}
      </div>
    </section>
  )
}

function AnimeInfo({ anime, details }: { anime: AnimeDetail; details: AniListDetails | null }) {
  const [staffExpanded, setStaffExpanded] = useState(false)
  const [titlesExpanded, setTitlesExpanded] = useState(false)
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const animeTitle = anime.title.trim()
  const canonicalTitles = new Set([animeTitle, details?.titles?.english, details?.titles?.romaji, details?.titles?.native, anime.titleRomaji, anime.titleJapanese].filter((title): title is string => Boolean(title)).map(normalizeTitle))
  const titles = uniqueStrings(anime.alternativeTitles ?? []).filter((title) => !canonicalTitles.has(normalizeTitle(title)))
  const alternativeTitles = titlesExpanded ? titles : titles.slice(0, 8)
  const studios = uniqueStudios(details?.studios ?? [])
  const staff = uniqueStaff(details?.staff ?? [])
  const topScores = details?.scoreDistribution.slice().sort((a, b) => b.amount - a.amount) ?? []
  const rankings = details?.rankings ?? []
  const externalLinks = details?.externalLinks ?? details?.officialLinks ?? []
  const themes = uniqueStrings((details?.tags ?? []).filter((tag) => /theme/i.test(tag.category ?? "")).map((tag) => tag.name))
  const tags = uniqueStrings((details?.tags ?? []).filter((tag) => !/theme/i.test(tag.category ?? "")).map((tag) => tag.name))
  const categories = uniqueStrings(anime.categories ?? []).filter((category) => !anime.genres.some((genre) => normalizeTitle(genre) === normalizeTitle(category)))
  const country = anime.countryOfOrigin === "JP" ? "Japan" : anime.countryOfOrigin === "US" ? "United States" : anime.countryOfOrigin === "KR" ? "South Korea" : anime.countryOfOrigin === "CN" ? "China" : anime.countryOfOrigin
  const ratings = [
    validScore(anime.score) && !/anilist/i.test(anime.ratingSource ?? "") ? { label: anime.metadataSources?.score === "Kitsu" ? "Kitsu rating" : "AnimExpo rating", value: `${anime.score} / 10` } : undefined,
    validPercentScore(anime.aniListAverageScore) ? { label: "AniList average score", value: `${(anime.aniListAverageScore! / 10).toFixed(1)} / 10` } : undefined,
    validPercentScore(anime.aniListMeanScore) ? { label: "AniList mean score", value: `${(anime.aniListMeanScore! / 10).toFixed(1)} / 10` } : undefined,
  ].filter((item): item is { label: string; value: string } => Boolean(item))
  const airing = details?.airingStatus ? humanize(details.airingStatus) : validText(anime.status) ? anime.status : undefined
  const staffVisible = staffExpanded ? staff : staff.slice(0, 10)

  return <div className="flex flex-col gap-4 sm:gap-5">
    <InfoSection title="General information">
      <InfoGrid rows={[
        ["English title", details?.titles?.english ?? anime.title],
        ["Romaji title", details?.titles?.romaji ?? anime.titleRomaji],
        ["Native title", details?.titles?.native ?? anime.titleJapanese],
        ["Format", anime.type], ["Source material", humanize(anime.sourceType)], ["Country", country],
        ["Airing status", airing], ["Season", [anime.season, anime.seasonYear].filter(Boolean).join(" ")],
        ["Release year", validYear(anime.year) ? String(anime.year) : undefined], ["Start date", formatDate(anime.startDate)],
        ["End date", formatDate(anime.endDate)], ["Episodes", positiveCount(anime.episodeCount)],
        ["Episode duration", anime.duration], ["Age rating", anime.ageRating],
      ]} />
    </InfoSection>

    {titles.length > 0 && <InfoSection title="Alternative titles">
      <div className="flex flex-wrap gap-2">{alternativeTitles.map((title) => <span key={title} className="max-w-full break-words rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75">{title}</span>)}</div>
      {titles.length > 8 && <button type="button" aria-expanded={titlesExpanded} onClick={() => setTitlesExpanded(!titlesExpanded)} className="mt-3 text-xs font-semibold text-primary">{titlesExpanded ? "Show less" : `Show all ${titles.length} titles`}</button>}
    </InfoSection>}

    {(anime.genres.length > 0 || themes.length > 0 || tags.length > 0 || categories.length > 0) && <InfoSection title="Genres, themes, tags and categories">
      <ChipGroup title="Genres" values={uniqueStrings(anime.genres)} primary />
      <ChipGroup title="Themes" values={themes} />
      <ChipGroup title="AniList tags" values={tagsExpanded ? tags : tags.slice(0, 12)} />
      {tags.length > 12 && <button type="button" aria-expanded={tagsExpanded} onClick={() => setTagsExpanded(!tagsExpanded)} className="mt-3 text-xs font-semibold text-primary">{tagsExpanded ? "Show fewer tags" : `Show all ${tags.length} tags`}</button>}
      <ChipGroup title="Categories" values={categories} />
    </InfoSection>}

    {studios.length > 0 && <InfoSection title="Production and studios">
      <div className="flex flex-wrap gap-2">{studios.map((studio) => <span key={studio.name} className={cn("rounded-full border px-3 py-1.5 text-xs", studio.isMain ? "border-primary/35 bg-primary/10 text-white" : "border-white/10 text-white/65")}>{studio.name}{studio.isMain && <span className="ml-1.5 text-primary">Main studio</span>}</span>)}</div>
    </InfoSection>}

    {staff.length > 0 && <InfoSection title="Staff and creators">
      <ul className="grid gap-x-6 sm:grid-cols-2">{staffVisible.map((member) => <li key={`${member.name}-${member.role}`} className="flex min-w-0 items-center justify-between gap-3 border-b border-white/[0.06] py-2.5 text-xs"><span className="min-w-0 break-words font-medium text-white/85">{member.url ? <a href={member.url} target="_blank" rel="noreferrer" className="hover:text-primary">{member.name}</a> : member.name}</span><span className="max-w-[48%] shrink-0 text-right text-white/45">{member.role}</span></li>)}</ul>
      {staff.length > 10 && <button type="button" aria-expanded={staffExpanded} onClick={() => setStaffExpanded(!staffExpanded)} className="mt-3 text-xs font-semibold text-primary">{staffExpanded ? "Show less" : `Show all ${staff.length} credits`}</button>}
    </InfoSection>}

    {details?.characters.length ? <InfoSection title="Characters and voice actors"><AniListCharacters characters={details.characters} /></InfoSection> : null}

    {(ratings.length || hasPositiveMetrics(anime) || rankings.length || topScores.length) ? <InfoSection title="Ratings and popularity">
      {ratings.length > 0 && <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ratings.map((rating) => <div key={rating.label} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3"><dt className="text-xs text-white/55">{rating.label}</dt><dd className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-white"><Star className="size-3.5 fill-primary text-primary" />{rating.value}</dd></div>)}</dl>}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60">{positiveMetric(anime.aniListPopularity) && <span>Members <b className="ml-1 text-white">{formatCount(anime.aniListPopularity!)}</b></span>}{positiveMetric(anime.aniListFavourites) && <span>Favourites <b className="ml-1 text-white">{formatCount(anime.aniListFavourites!)}</b></span>}{positiveMetric(anime.aniListTrending) && <span>Trending <b className="ml-1 text-white">{formatCount(anime.aniListTrending!)}</b></span>}{positiveMetric(anime.popularityRank) && <span>Kitsu popularity <b className="ml-1 text-white">#{anime.popularityRank}</b></span>}{positiveMetric(anime.ratingRank) && <span>Kitsu rank <b className="ml-1 text-white">#{anime.ratingRank}</b></span>}</div>
      {rankings.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{rankings.map((rank) => <li key={`${rank.type}-${rank.context}-${rank.rank}`} className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/65"><span className="font-semibold text-primary">#{rank.rank}</span> {humanize(rank.type)} {rank.format ? `· ${humanize(rank.format)}` : ""} {rank.context ? `· ${rank.context}` : ""}</li>)}</ul>}
      {topScores.length > 0 && <div className="mt-4"><h3 className="mb-2 text-xs font-semibold text-white/65">AniList score distribution</h3><div className="grid gap-1.5 sm:grid-cols-2">{topScores.slice().sort((a, b) => a.score - b.score).map((score) => <div key={score.score} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 text-[10px] text-white/55"><span>{(score.score / 10).toFixed(1)}</span><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]" role="img" aria-label={`${formatCount(score.amount)} votes`}><div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.max(3, score.amount / Math.max(...topScores.map((item) => item.amount)) * 100)}%` }} /></div><span className="tabular-nums">{formatCount(score.amount)}</span></div>)}</div></div>}
    </InfoSection> : null}

    {(externalLinks.length > 0 || validText(anime.aniListUrl) || details?.trailer) && <InfoSection title="Additional information">
      <div className="flex flex-wrap gap-2">{validText(anime.aniListUrl) && <ExternalLink href={anime.aniListUrl} label="AniList" />}{externalLinks.map((link) => <ExternalLink key={`${link.site}-${link.url}`} href={link.url} label={link.site} />)}{details?.trailer && <ExternalLink href={details.trailer.url} label="Trailer" />}</div>
      {details?.trailer && <p className="mt-3 text-xs text-white/50">Trailer hosted on {details.trailer.site} · {details.trailer.id}</p>}
    </InfoSection>}

    {!details && <p className="text-xs text-white/40">AniList details are temporarily unavailable. Catalogue information remains available.</p>}
  </div>
}

function EpisodeCountdown({ episode, airingAt, onExpired }: { episode: number; airingAt: number; onExpired: () => Promise<void> }) {
  const [now, setNow] = useState(() => Date.now())
  const [expired, setExpired] = useState(false)
  const refreshStarted = useRef(false)
  const target = airingAt * 1000
  const valid = Number.isSafeInteger(episode) && episode > 0 && Number.isSafeInteger(airingAt) && target > now && !Number.isNaN(new Date(target).getTime())
  useEffect(() => {
    refreshStarted.current = false
    setExpired(false)
  }, [episode, airingAt])
  useEffect(() => {
    if (!valid) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [valid, episode, airingAt])
  useEffect(() => {
    if (target > now) return
    setExpired(true)
    if (refreshStarted.current) return
    refreshStarted.current = true
    void onExpired()
  }, [target, now, onExpired])
  if (!valid || expired) return null
  const remaining = Math.max(0, Math.floor((target - now) / 1000))
  const parts = [Math.floor(remaining / 86400), Math.floor((remaining % 86400) / 3600), Math.floor((remaining % 3600) / 60), remaining % 60]
  return <section aria-label={`Episode ${episode} countdown`} className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171719] px-4 py-4 sm:px-6 sm:py-5">
    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-primary/15 via-primary/[0.04] to-transparent" />
    <p className="relative text-[10px] font-bold uppercase tracking-[0.17em] text-white/55 sm:text-xs">Episode {episode} will be released in</p>
    <div className="relative mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:gap-4">
      {parts.map((value, index) => <div key={index} className="min-w-0"><p className="text-xl font-black tabular-nums tracking-tight text-white sm:text-3xl md:text-4xl">{String(value).padStart(2, "0")}</p><p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-primary sm:text-[10px]">{["Days", "Hrs", "Mins", "Secs"][index]}</p></div>)}
    </div>
  </section>
}

function Essential({ label, value }: { label: string; value?: string }) {
  if (!validText(value)) return null
  return <div className="min-w-[6.8rem] flex-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 sm:min-w-0"><p className="text-[10px] text-white/45">{label}</p><p className="mt-1 truncate text-xs font-semibold text-white/90 sm:text-sm">{value}</p></div>
}
function InfoSection({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5"><h2 className="mb-4 text-sm font-bold text-white sm:text-base">{title}</h2>{children}</section> }
function InfoGrid({ rows }: { rows: Array<[string, string | number | undefined]> }) { const visible = rows.filter(([, value]) => validText(value)); if (!visible.length) return null; return <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[11px] text-white/45">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-white/85">{value}</dd></div>)}</dl> }
function ChipGroup({ title, values, primary = false }: { title: string; values: string[]; primary?: boolean }) { if (!values.length) return null; return <div className="mt-4 first:mt-0"><h3 className="mb-2 text-xs font-semibold text-white/50">{title}</h3><div className="flex flex-wrap gap-2">{values.map((value) => <span key={value} className={cn("rounded-full border px-3 py-1.5 text-xs", primary ? "border-primary/25 bg-primary/[0.08] text-white/85" : "border-white/[0.08] text-white/60")}>{value}</span>)}</div></div> }
function ExternalLink({ href, label }: { href: string; label: string }) { if (!safeExternalUrl(href)) return null; return <a href={href} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 transition-colors hover:border-primary/50 hover:text-primary">{label}</a> }
function normalizeTitle(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^\p{L}\p{N}]+/gu, "") }
function hasValidTrailer(details: AniListDetails) {
  const trailer = details.trailer
  if (!trailer || trailer.site.toLowerCase() !== "youtube") return false
  try {
    const url = new URL(trailer.url)
    return url.protocol === "https:" && url.hostname === "www.youtube.com" && url.pathname === "/watch" && /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get("v") ?? "")
  } catch { return false }
}
function uniqueStrings(values: Array<string | undefined>): string[] { const seen = new Set<string>(); return values.flatMap((value) => { if (!validText(value)) return []; const clean = value.trim(); const key = normalizeTitle(clean); if (!key || seen.has(key)) return []; seen.add(key); return [clean] }) }
function uniqueStudios<T extends { name: string; isMain: boolean }>(items: T[]): T[] { const seen = new Set<string>(); return items.filter((item) => { const key = normalizeTitle(item.name); if (!key || seen.has(key)) return false; seen.add(key); return true }) }
function uniqueStaff<T extends { name: string; role: string }>(items: T[]): T[] { const seen = new Set<string>(); return items.filter((item) => { const key = `${normalizeTitle(item.name)}:${normalizeTitle(item.role)}`; if (seen.has(key)) return false; seen.add(key); return true }) }
function uniqueRelations<T extends { id: number }>(items: T[]): T[] { const seen = new Set<number>(); return items.filter((item) => { if (seen.has(item.id)) return false; seen.add(item.id); return true }) }
function validText(value: unknown): value is string { return (typeof value === "string" || typeof value === "number") && Boolean(String(value).trim()) && !/^(?:n\/?a|unknown|null|undefined|0)$/i.test(String(value).trim()) }
function positiveCount(value?: string) { if (!validText(value)) return undefined; const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? number : undefined }
function validYear(value?: number) { return typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= new Date().getFullYear() + 5 }
function validScore(value?: string) { if (!validText(value)) return false; const score = Number(value); return Number.isFinite(score) && score > 0 && score <= 10 }
function validPercentScore(value?: number) { return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100 }
function positiveMetric(value?: number) { return typeof value === "number" && Number.isSafeInteger(value) && value > 0 }
function hasPositiveMetrics(anime: AnimeSummary) { return [anime.aniListPopularity, anime.aniListFavourites, anime.aniListTrending, anime.popularityRank, anime.ratingRank].some(positiveMetric) }
function formatCount(value: number) { return new Intl.NumberFormat("en").format(value) }
function compactStatus(value?: string) { if (!validText(value)) return undefined; return value.length > 15 ? humanize(value) : value }
function humanize(value?: string) { return validText(value) ? value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()) : undefined }
function formatDate(value?: string) { if (!validText(value) || !/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) return undefined; const date = new Date(`${value.length === 4 ? value + "-01-01" : value.length === 7 ? value + "-01" : value}T12:00:00`); return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat(undefined, { year: "numeric", month: value.length === 4 ? undefined : "short", day: value.length === 10 ? "numeric" : undefined }).format(date) }
function safeExternalUrl(value: string) { try { return new URL(value).protocol === "https:" } catch { return false } }
