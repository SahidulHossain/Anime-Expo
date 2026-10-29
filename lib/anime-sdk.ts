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

function logSdk(event: string, details: Record<string, unknown> = {}) {
  console.info(`[anime-sdk] ${JSON.stringify({ event, ...details })}`)
}

function enabled() {
  const flag = process.env.ANIME_SDK_ENABLED?.trim().toLowerCase()
  const baseConfigured = Boolean(process.env.ANIME_SDK_BASE_URL?.trim())
  const tokenConfigured = Boolean(process.env.ANIME_SDK_API_TOKEN?.trim())
  const isEnabled = flag === "true" && baseConfigured && tokenConfigured
  logSdk("sdk_enabled", { enabled: isEnabled, flag, baseConfigured, tokenConfigured })
  return isEnabled
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
  const titleValue = raw.title
  const title = normalize(typeof titleValue === "object" && titleValue !== null ? (titleValue as { english?: unknown }).english : titleValue ?? raw.name)
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
  const base = process.env.ANIME_SDK_BASE_URL?.trim() || DEFAULT_BASE_URL
  const path = process.env.ANIME_SDK_SEARCH_PATH?.trim() || "/search"
  logSdk("sdk_request_started", { queryLength: query.length, page, provider: process.env.ANIME_SDK_PROVIDER || PROVIDER_ID })
  const url = new URL(path, base)
  url.searchParams.set("q", query)
  url.searchParams.set("provider", process.env.ANIME_SDK_PROVIDER || PROVIDER_ID)
  url.searchParams.set("page", String(page))
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json", Authorization: `Bearer ${process.env.ANIME_SDK_API_TOKEN}` },
    cache: "no-store",
  })
  logSdk("sdk_request_status", { status: response.status, ok: response.ok })
  if (!response.ok) throw new Error(`Anime SDK returned ${response.status}`)
  const payload: unknown = await response.json()
  const rows = Array.isArray(payload) ? payload : (payload as { items?: unknown[]; data?: unknown[] })?.items ?? (payload as { data?: unknown[] })?.data ?? []
  const items = rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object")).map(mapItem).filter((item): item is AnimeSummary => Boolean(item))
  logSdk("sdk_result_count", { received: rows.length, valid: items.length })
  return items
}

function getResults(query: string, page: number) {
  const key = `${query.toLowerCase()}::${page}`
  const existing = inFlight.get(key)
  if (existing) return existing
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const promise = request(query, page, controller.signal).then((items) => { recordSuccess(); return items }).catch((error: unknown) => { recordFailure(); logSdk("sdk_failure_reason", { reason: error instanceof DOMException && error.name === "AbortError" ? "timeout" : error instanceof Error ? error.message.slice(0, 120) : "unknown" }); return [] }).finally(() => { clearTimeout(timer); inFlight.delete(key) })
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
  logSdk("sdk_merge_count", { received: items.length, merged: additions.length })
  return { ...existing, items: [...existing.items, ...additions], total: existing.total + additions.length }
}
