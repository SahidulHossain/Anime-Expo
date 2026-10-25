import "server-only"

import curated from "./curated-franchises.json"
import type { AnimeDetail, AnimeSummary } from "./types"

type Relation = { id: number; title: string; type?: string; format?: string; year?: number; poster?: string; relation?: string; source?: "anilist" | "jikan" | "curated" }
export type WatchOrderEntry = AnimeSummary & { position: number; relation?: string; source: "anilist" | "jikan" | "curated" | "animexpo" }
export type FranchiseData = { recommended: WatchOrderEntry[]; release: WatchOrderEntry[]; movies: AnimeSummary[]; sourceCount: number }

const ANILIST_URL = "https://graphql.anilist.co"
const JIKAN_URL = "https://api.jikan.moe/v4"
const cache = new Map<string, { expires: number; value: FranchiseData }>()
const pending = new Map<string, Promise<FranchiseData>>()
const TTL = 1000 * 60 * 30

function normalize(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim() }
function matchCatalog(relations: Relation[], catalog: AnimeSummary[], current: AnimeDetail): WatchOrderEntry[] {
  const candidates = [{ ...current, relation: "Current title" }, ...catalog]
  const seen = new Set<number>()
  return relations.map((relation, index) => {
    const target = normalize(relation.title)
    const found = candidates.find((item) => !seen.has(item.id) && normalize(item.title) === target) || candidates.find((item) => !seen.has(item.id) && (normalize(item.title).includes(target) || target.includes(normalize(item.title))))
    if (!found) return null
    seen.add(found.id)
    return { ...found, position: index + 1, relation: relation.relation, source: relation.source as WatchOrderEntry["source"] }
  }).filter(Boolean) as WatchOrderEntry[]
}

async function getAniList(id?: string, title?: string): Promise<Relation[]> {
  if (!id && !title) return []
  const query = `query ($id: Int, $search: String) { Media(id: $id, search: $search, type: ANIME) { relations { edges { relation node { id title { romaji english native } format startDate { year } coverImage { large } } } } } }`
  const response = await fetch(ANILIST_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables: id ? { id: Number(id) } : { search: title } }), next: { revalidate: 1800 } })
  if (!response.ok) return []
  const media = (await response.json())?.data?.Media
  return (media?.relations?.edges ?? []).map((edge: any) => ({ id: edge.node.id, title: edge.node.title.english || edge.node.title.romaji || edge.node.title.native, format: edge.node.format, year: edge.node.startDate?.year, poster: edge.node.coverImage?.large, relation: edge.relation, source: "anilist" }))
}

async function getJikan(id?: string, title?: string): Promise<Relation[]> {
  const path = id ? `${JIKAN_URL}/anime/${id}/relations` : `${JIKAN_URL}/anime?q=${encodeURIComponent(title || "")}&limit=1`
  const response = await fetch(path, { next: { revalidate: 1800 } })
  if (!response.ok) return []
  const json = await response.json()
  if (!id) { const malId = json?.data?.[0]?.mal_id; return malId ? getJikan(String(malId)) : [] }
  return (json?.data ?? []).flatMap((group: any) => (group.entry ?? []).map((entry: any) => ({ id: entry.mal_id, title: entry.name, relation: group.relation, source: "jikan" })))
}

export async function getFranchiseData(anime: AnimeDetail, catalog: AnimeSummary[]): Promise<FranchiseData> {
  const key = String(anime.aniListId || anime.malId || normalize(anime.title))
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.value
  const existing = pending.get(key)
  if (existing) return existing
  const promise = (async () => {
    const curatedEntries = ((curated.franchises as Record<string, Relation[]>)[normalize(anime.title)] ?? []).map((entry) => ({ ...entry, source: "curated" as const }))
    const [aniList, jikan] = await Promise.allSettled([getAniList(anime.aniListId, anime.title), getJikan(anime.malId, anime.title)])
    const sources = [aniList, jikan].flatMap((result) => result.status === "fulfilled" ? result.value : [])
    const unique: Relation[] = Array.from(new Map([...curatedEntries, ...sources].map((entry) => [normalize(entry.title), entry] as const)).values())
    const recommended = matchCatalog(unique, catalog, anime)
    const release = [...recommended].sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.position - b.position).map((entry, index) => ({ ...entry, position: index + 1 }))
    const movies = recommended.filter((entry) => entry.type?.toLowerCase() === "movie" || entry.relation?.toLowerCase().includes("movie"))
    const value = { recommended, release, movies, sourceCount: new Set(sources.map((entry) => entry.source)).size }
    cache.set(key, { expires: Date.now() + TTL, value })
    return value
  })().finally(() => pending.delete(key))
  pending.set(key, promise)
  return promise
}
