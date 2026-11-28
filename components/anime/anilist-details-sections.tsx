"use client"

import Link from "next/link"
import { useState } from "react"
import { Play } from "lucide-react"
import type { AniListCharacter, AniListDetails, AniListRecommendation, AniListRelatedMedia, AniListTag } from "@/lib/anilist-types"
import type { AnimeSummary } from "@/lib/types"

function imageIsValid(value?: string) {
  if (!value) return false
  try { return new URL(value).protocol === "https:" } catch { return false }
}

function validYoutubeTrailer(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "www.youtube.com" && url.pathname === "/watch" && /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get("v") ?? "")
  } catch { return false }
}

function displayRelation(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function AniListProduction({ details }: { details: AniListDetails }) {
  const studios = details.studios.slice(0, 8)
  const staff = details.staff.slice(0, 8)
  if (!studios.length && !staff.length) return null
  return <section className="space-y-3">
    <h2 className="text-sm font-bold text-white sm:text-base">Production</h2>
    {studios.length > 0 && <div className="flex flex-wrap gap-2">{studios.map((studio) => <span key={`${studio.name}-${studio.isMain}`} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80">{studio.name}{studio.isMain ? <span className="ml-1 text-primary">· Main studio</span> : null}</span>)}</div>}
    {staff.length > 0 && <ul className="grid gap-2 sm:grid-cols-2">{staff.map((member) => <li key={`${member.name}-${member.role}`} className="flex min-w-0 items-baseline justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs"><span className="truncate font-medium text-white/85">{member.name}</span><span className="shrink-0 text-right text-white/50">{member.role}</span></li>)}</ul>}
  </section>
}

export function AniListTags({ tags }: { tags: AniListTag[] }) {
  const selected = tags.filter((tag) => (tag.rank ?? 0) >= 45 && !tag.isMediaSpoiler && !tag.isGeneralSpoiler).slice(0, 6)
  if (!selected.length) return null
  return <section className="space-y-2">
    <h2 className="text-sm font-bold text-white sm:text-base">Themes</h2>
    <div className="flex flex-wrap gap-2">{selected.map((tag) => <span key={tag.name} title={tag.description} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground">{tag.name}</span>)}</div>
  </section>
}

export function AniListCharacters({ characters }: { characters: AniListCharacter[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!characters.length) return null
  const visibleCharacters = expanded ? characters : characters.slice(0, 8)
  return <>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {visibleCharacters.map((character) => <article key={`${character.name}-${character.role}`} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]">
        <div className="aspect-[4/3] bg-white/[0.035]">{imageIsValid(character.image) ? <img src={character.image} alt={character.name} loading="lazy" decoding="async" className="h-full w-full object-cover object-top" /> : null}</div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-semibold text-white">{character.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{character.role} character</p>
          {character.voiceActors.length > 0 && <ul className="mt-2 flex flex-col gap-1 border-t border-white/[0.08] pt-2">{character.voiceActors.map((actor) => <li key={`${actor.name}-${actor.language}`} className="break-words text-xs"><span className="text-white/80">{actor.name}</span><span className="ml-1 text-muted-foreground">· {actor.language === "Unknown" ? "Voice actor" : `${actor.language} voice`}</span></li>)}</ul>}
        </div>
      </article>)}
    </div>
    {characters.length > 8 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="mt-4 text-xs font-semibold text-primary">{expanded ? "Show fewer characters" : `Show all ${characters.length} characters`}</button>}
  </>
}

function AniListMediaGrid({ items, kind, catalog = [] }: { items: AniListRelatedMedia[] | AniListRecommendation[]; kind: "franchise" | "recommendation"; catalog?: AnimeSummary[] }) {
  if (!items.length) return null
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {items.map((item) => {
      const internal = catalog.find((anime) => String(anime.aniListId ?? "") === String(item.id) || [anime.title, ...(anime.alternativeTitles ?? [])].some((title) => normalizeTitle(title) === normalizeTitle(item.title)))
      const metadata = <>
        {imageIsValid(item.image) ? <img src={item.image} alt="" loading="lazy" decoding="async" className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="aspect-[2/3] bg-white/[0.04]" aria-hidden />}
        <div className="p-3">
          <p className="line-clamp-2 text-sm font-semibold text-white group-hover:text-primary">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{kind === "franchise" ? displayRelation((item as AniListRelatedMedia).relation) : "Recommendation"}{item.format ? ` · ${item.format}` : ""}{item.year ? ` · ${item.year}` : ""}{item.score && item.score <= 100 ? ` · AniList ${(item.score / 10).toFixed(1)}` : ""}</p>
        </div>
      </>
      const className = "group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] transition-colors hover:border-primary/40"
      return internal ? <Link key={item.id} href={`/anime/${internal.id}`} className={className}>{metadata}</Link> : <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className={className}>{metadata}</a>
    })}
  </div>
}

function normalizeTitle(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^\p{L}\p{N}]+/gu, "") }

export function AniListFranchise({ relations, catalog = [] }: { relations: AniListRelatedMedia[]; catalog?: AnimeSummary[] }) {
  return <AniListMediaGrid items={relations} kind="franchise" catalog={catalog} />
}

export function AniListRecommendations({ recommendations, catalog = [] }: { recommendations: AniListRecommendation[]; catalog?: AnimeSummary[] }) {
  return <AniListMediaGrid items={recommendations} kind="recommendation" catalog={catalog} />
}

export function AniListTrailer({ details, title }: { details: AniListDetails; title: string }) {
  const trailer = details.trailer
  if (!trailer || !validYoutubeTrailer(trailer.url) || trailer.site.toLowerCase() !== "youtube") return null
  return <a href={trailer.url} target="_blank" rel="noreferrer" className="group relative block max-w-xl overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    {imageIsValid(trailer.thumbnail) ? <img src={trailer.thumbnail} alt={`${title} trailer thumbnail`} loading="lazy" decoding="async" className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="flex aspect-video items-center justify-center bg-white/[0.04]"><span className="sr-only">Trailer preview unavailable</span></div>}
    <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-lg"><Play className="size-4 fill-current" />Watch trailer</span></span>
  </a>
}
