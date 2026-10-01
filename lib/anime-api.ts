import "server-only"

import type { AnimeSummary, AnimeDetail, Episode, Paginated } from "./types"

// Centralized, server-only data source. The upstream provider is never
// referenced anywhere in the client bundle or the UI.
const BASE_URL = process.env.ANIME_API_BASE_URL || "https://anikotoapi.site"
const REVALIDATE_SECONDS = 60 * 10

type RawAnime = {
  id: number
  title?: string
  alternative?: string
  native?: string
  titles?: string
  poster?: string
  background_image?: string
  description?: string
  year?: number
  status?: string
  score?: string
  episodes?: string
  rating?: string
  duration?: string
  is_sub?: number
  is_dub?: number
  terms_by_type?: Record<string, string[] | undefined>
}

type RawEpisode = {
  id: number
  title?: string
  number?: number
  embed_url?: { sub?: string; dub?: string }
}

function mapAnime(raw: RawAnime): AnimeSummary {
  const genres = raw.terms_by_type?.genre ?? []
  const type = raw.terms_by_type?.type?.[0]
  return {
    id: raw.id,
    title: raw.title ?? "Untitled",
    poster: raw.poster ?? "",
    banner: raw.background_image || undefined,
    description: raw.description || undefined,
    year: raw.year || undefined,
    status: raw.status || undefined,
    score: raw.score || undefined,
    episodeCount: raw.episodes || undefined,
    rating: raw.rating || undefined,
    type: type || undefined,
    duration: raw.duration || undefined,
    isSub: raw.is_sub ?? 0,
    isDub: raw.is_dub ?? 0,
    genres: Array.isArray(genres) ? genres : [],
  }
}

function mapEpisode(raw: RawEpisode): Episode {
  return {
    id: raw.id,
    title: raw.title || `Episode ${raw.number ?? ""}`.trim(),
    number: raw.number ?? 0,
    sub: raw.embed_url?.sub || undefined,
    dub: raw.embed_url?.dub || undefined,
  }
}

async function request(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, BASE_URL)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value))
    }
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS },
  })

  if (!res.ok) {
    throw new Error(`Upstream request failed with status ${res.status}`)
  }

  const json = await res.json()
  if (json?.ok === false) {
    const err = new Error(json?.error || "Not found") as Error & { code?: string }
    err.code = json?.code
    throw err
  }
  return json
}

export async function getRecentAnime(page = 1, perPage = 24): Promise<Paginated<AnimeSummary>> {
  const json = await request("/recent-anime", { page: Math.max(1, page), per_page: Math.min(perPage, 100) })
  const data: RawAnime[] = json?.data ?? []
  const pagination = json?.pagination ?? {}
  return {
    items: data.map(mapAnime),
    page: pagination.page ?? page,
    perPage: pagination.per_page ?? perPage,
    total: pagination.total ?? data.length,
    totalPages: pagination.total_pages ?? 1,
  }
}

// The upstream has no search endpoint and caps pages at 100 items, so search
// runs against an in-memory index of the full catalog built on the server.
const INDEX_PAGE_SIZE = 100
const INDEX_CONCURRENCY = 10
const INDEX_TTL_MS = 30 * 60 * 1000

type IndexedAnime = { anime: AnimeSummary; title: string; haystack: string }

let indexCache: { builtAt: number; entries: IndexedAnime[] } | null = null
let indexBuild: Promise<IndexedAnime[]> | null = null

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

function toIndexed(raw: RawAnime): IndexedAnime {
  const anime = mapAnime(raw)
  anime.description = undefined
  const title = normalize(anime.title)
  return {
    anime,
    title,
    haystack: normalize([raw.title, raw.alternative, raw.native, raw.titles].filter(Boolean).join(" ")),
  }
}

async function fetchIndexPage(page: number): Promise<{ data: RawAnime[]; totalPages: number }> {
  const json = await request("/recent-anime", { page, per_page: INDEX_PAGE_SIZE })
  return { data: json?.data ?? [], totalPages: json?.pagination?.total_pages ?? 1 }
}

async function buildIndex(): Promise<IndexedAnime[]> {
  const first = await fetchIndexPage(1)
  const pages: RawAnime[][] = [first.data]
  const remaining = Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => i + 2)

  for (let i = 0; i < remaining.length; i += INDEX_CONCURRENCY) {
    const batch = remaining.slice(i, i + INDEX_CONCURRENCY)
    const results = await Promise.allSettled(batch.map(fetchIndexPage))
    for (const result of results) {
      if (result.status === "fulfilled") pages.push(result.value.data)
    }
  }

  const seen = new Set<number>()
  const entries: IndexedAnime[] = []
  for (const raw of pages.flat()) {
    if (!raw?.id || seen.has(raw.id)) continue
    seen.add(raw.id)
    entries.push(toIndexed(raw))
  }
  return entries
}

async function getIndex(): Promise<IndexedAnime[]> {
  const fresh = indexCache && Date.now() - indexCache.builtAt < INDEX_TTL_MS
  if (fresh) return indexCache!.entries

  if (!indexBuild) {
    indexBuild = buildIndex()
      .then((entries) => {
        if (entries.length > 0) indexCache = { builtAt: Date.now(), entries }
        return entries
      })
      .finally(() => {
        indexBuild = null
      })
  }

  // Serve a stale index while a rebuild runs in the background.
  if (indexCache) return indexCache.entries
  return indexBuild
}

function scoreMatch(entry: IndexedAnime, query: string, tokens: string[]) {
  if (entry.title === query) return 100
  if (entry.title.startsWith(query)) return 80
  if (entry.title.includes(query)) return 60
  if (entry.haystack.includes(query)) return 50
  if (tokens.every((t) => entry.title.includes(t))) return 40
  if (tokens.every((t) => entry.haystack.includes(t))) return 30
  return 0
}

export async function searchAnime(query: string, page = 1, perPage = 30): Promise<Paginated<AnimeSummary>> {
  const normalized = normalize(query)
  if (!normalized) return { items: [], page: 1, perPage, total: 0, totalPages: 0 }

  const tokens = normalized.split(" ").filter(Boolean)
  const index = await getIndex()

  const matches = index
    .map((entry, order) => ({ entry, order, score: scoreMatch(entry, normalized, tokens) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)

  const total = matches.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * perPage

  return {
    items: matches.slice(start, start + perPage).map((m) => m.entry.anime),
    page: safePage,
    perPage,
    total,
    totalPages,
  }
}

export async function getAnimeDetail(id: string | number): Promise<AnimeDetail | null> {
  try {
    const json = await request(`/series/${id}`)
    const anime: RawAnime | undefined = json?.data?.anime
    const episodes: RawEpisode[] = json?.data?.episodes ?? []
    if (!anime) return null
    return {
      ...mapAnime(anime),
      episodes: episodes.map(mapEpisode).sort((a, b) => a.number - b.number),
    }
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === "not_found") return null
    throw err
  }
}
