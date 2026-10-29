import "server-only"

import type { AnimeSummary, Paginated } from "./types"

const DEFAULT_BASE_URL = "https://animexpo-anime-sdk.onrender.com"
const REQUEST_TIMEOUT_MS = 8000
const GRACE_PERIOD_MS = 250
const PROVIDER_ID = "anikoto"
const COOLDOWN_MS = 30_000
const FAILURE_LIMIT = 3

type SdkState = { failures: number; openedAt: number }
let state: SdkState = { failures: 0, openedAt: 0 }
let inFlight = new Map<string, Promise<AnimeSummary[]>>()

function enabled() {
  return process.env.ANIME_SDK_ENABLED === "true" && Boolean(process.env.ANIME_SDK_API_TOKEN)
}

function canRequest() {
  if (!enabled()) return false
  if (state.failures < FAILURE_LIMIT) return true
  if (Date.now() - state.openedAt >= COOLDOWN_MS) {
    state = { failures: 0, openedAt: 0 }
    return true
  }
  return false
}

function recordFailure() {
  state.failures += 1
  if (state.failures >= FAILURE_LIMIT) state.openedAt = Date.now()
}

function recordSuccess() {
  state = { failures: 0, openedAt: 0 }
}

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function mapItem(raw: Record<string, unknown>): AnimeSummary | null {
  const id = Number(raw.animExpoId ?? raw.animexpoId ?? raw.internalId)
  const title = normalize(raw.title ?? raw.name ?? (raw.title as { english?: string } | undefined)?.english)
  if (!Number.isSafeInteger(id) || id < 1 || !title) return null
  return {
    id,
    animExpoId: id,
    title,
    poster: normalize(raw.poster ?? raw.image ?? raw.coverImage),
    banner: normalize(raw.banner) || undefined,
    description: normalize(raw.description) || undefined,
    year: Number(raw.year) || undefined,
    status: normalize(raw.status) || undefined,
    score: normalize(raw.score ?? raw.rating) || undefined,
    episodeCount: normalize(raw.episodeCount ?? raw.episodes) || undefined,
    type: normalize(raw.type ?? raw.format) || undefined,
    aniListId: normalize(raw.aniListId ?? raw.anilistId) || undefined,
    malId: normalize(raw.malId) || undefined,
    isSub: Number(raw.isSub ?? raw.sub) || 0,
    isDub: Number(raw.isDub ?? raw.dub) || 0,
    genres: Array.isArray(raw.genres) ? raw.genres.filter((item): item is string => typeof item === "string") : [],
  }
}

async function request(query: string, page: number, signal: AbortSignal): Promise<AnimeSummary[]> {
  const base = process.env.ANIME_SDK_BASE_URL || DEFAULT_BASE_URL
  const path = process.env.ANIME_SDK_SEARCH_PATH || "/search"
  const url = new URL(path, base)
  url.searchParams.set("q", query)
  url.searchParams.set("provider", process.env.ANIME_SDK_PROVIDER || PROVIDER_ID)
  url.searchParams.set("page", String(page))
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json", Authorization: `Bearer ${process.env.ANIME_SDK_API_TOKEN}` },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Anime SDK returned ${response.status}`)
  const payload: unknown = await response.json()
  const rows = Array.isArray(payload) ? payload : (payload as { items?: unknown[]; data?: unknown[] })?.items ?? (payload as { data?: unknown[] })?.data ?? []
  return rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object")).map(mapItem).filter((item): item is AnimeSummary => Boolean(item))
}

function getResults(query: string, page: number) {
  const key = `${query.toLowerCase()}::${page}`
  const existing = inFlight.get(key)
  if (existing) return existing
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const promise = request(query, page, controller.signal).then((items) => { recordSuccess(); return items }).catch((error) => { recordFailure(); return [] }).finally(() => { clearTimeout(timer); inFlight.delete(key) })
  inFlight.set(key, promise)
  return promise
}

export async function mergeOptionalSdkSearch(existing: Paginated<AnimeSummary>, query: string, page: number) {
  if (!canRequest()) return existing
  const sdk = getResults(query, page)
  const items = await Promise.race([sdk, new Promise<AnimeSummary[]>((resolve) => setTimeout(() => resolve([]), GRACE_PERIOD_MS))])
  if (!items.length) return existing
  const seen = new Set(existing.items.map((item) => `${item.id}:${item.title.toLowerCase()}`))
  const additions = items.filter((item) => !seen.has(`${item.id}:${item.title.toLowerCase()}`))
  return { ...existing, items: [...existing.items, ...additions], total: existing.total + additions.length }
}
