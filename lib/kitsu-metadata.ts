import "server-only"

import type { AnimeSummary } from "@/lib/types"
import type { KitsuMetadata } from "@/lib/kitsu-types"

const KITSU_API = "https://kitsu.io/api/edge"
const SUCCESS_TTL_SECONDS = 14 * 24 * 60 * 60
const FAILURE_TTL_MS = 10 * 60 * 1000
const COOLDOWN_MS = 30 * 60 * 1000
const FAILURE_THRESHOLD = 3
const REQUEST_TIMEOUT_MS = 4_000

type KitsuResource = {
  id?: string
  type?: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data?: Array<{ type?: string; id?: string }> }>
}

type CacheEntry = { expiresAt: number; value: KitsuMetadata | null }
const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<KitsuMetadata | null>>()
let failures = 0
let cooldownUntil = 0

function storeCache(key: string, entry: CacheEntry) {
  if (cache.size >= 500) {
    const now = Date.now()
    for (const [cachedKey, cachedEntry] of cache) {
      if (cachedEntry.expiresAt <= now) cache.delete(cachedKey)
      if (cache.size < 500) break
    }
    if (cache.size >= 500) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) cache.delete(oldestKey)
    }
  }
  cache.set(key, entry)
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const result = value.trim()
  return result && !/^(?:n\/?a|unknown|null|undefined)$/i.test(result) ? result : undefined
}

function normalizeTitle(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^\p{L}\p{N}]+/gu, "")
}

function normalizedType(value?: string): string | undefined {
  const type = value?.trim().toLowerCase()
  if (!type) return undefined
  if (/movie|film/.test(type)) return "movie"
  if (/ova/.test(type)) return "ova"
  if (/ona/.test(type)) return "ona"
  if (/special/.test(type)) return "special"
  if (/tv|series/.test(type)) return "tv"
  return type
}

function getStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : []
}

function imageUrl(value: unknown, preferred: "large" | "original" | "medium"): string | undefined {
  if (!value || typeof value !== "object") return undefined
  const image = value as Record<string, unknown>
  for (const key of [preferred, "original", "large", "medium", "small"]) {
    const url = clean(image[key])
    if (url && /^https:\/\//i.test(url)) return url
  }
  return undefined
}

function extractMetadata(resource: KitsuResource, included: KitsuResource[]): KitsuMetadata | null {
  const attributes = resource.attributes
  if (!resource.id || resource.type !== "anime" || !attributes) return null
  const titles = (attributes.titles && typeof attributes.titles === "object" ? attributes.titles : {}) as Record<string, unknown>
  const title = clean(titles.en) ?? clean(attributes.canonicalTitle) ?? clean(titles.en_jp)
  const titleJapanese = clean(titles.ja_jp)
  const titleRomaji = clean(titles.en_jp)
  const alternativeTitles = Array.from(new Set([
    ...getStringList(attributes.abbreviatedTitles),
    ...Object.values(titles).filter((value): value is string => typeof value === "string").map((value) => value.trim()),
  ].filter(Boolean))).filter((value) => ![title, titleJapanese, titleRomaji].some((primary) => primary && normalizeTitle(value) === normalizeTitle(primary)))
  const genresById = new Map(included.filter((item) => item.type === "genres" && item.id).map((item) => [item.id!, clean(item.attributes?.name)]))
  const genreRefs = resource.relationships?.genres?.data ?? []
  const genres = genreRefs.map((item) => genresById.get(item.id ?? "")).filter((value): value is string => Boolean(value))
  const categoriesById = new Map(included.filter((item) => item.type === "categories" && item.id).map((item) => [item.id!, clean(item.attributes?.title)]))
  const categoryRefs = resource.relationships?.categories?.data ?? []
  const categories = categoryRefs.map((item) => categoriesById.get(item.id ?? "")).filter((value): value is string => Boolean(value))
  const averageRating = clean(attributes.averageRating)
  const parsedRating = averageRating ? Number(averageRating) : NaN
  const rating = Number.isFinite(parsedRating) && parsedRating >= 0 && parsedRating <= 100 ? parsedRating : NaN
  const startDate = clean(attributes.startDate)
  const endDate = clean(attributes.endDate)
  const year = startDate ? Number(startDate.slice(0, 4)) : undefined
  const candidateTrailerId = clean(attributes.youtubeVideoId)
  const trailerId = candidateTrailerId && /^[A-Za-z0-9_-]{11}$/.test(candidateTrailerId) ? candidateTrailerId : undefined
  const episodeCount = typeof attributes.episodeCount === "number" && attributes.episodeCount > 0 ? String(attributes.episodeCount) : undefined
  const episodeLength = typeof attributes.episodeLength === "number" && attributes.episodeLength > 0 ? `${attributes.episodeLength} min` : undefined
  const rawStatus = clean(attributes.status)?.toLowerCase()
  const status = rawStatus === "current" ? "Currently Airing" : rawStatus === "finished" ? "Finished" : rawStatus === "upcoming" ? "Upcoming" : rawStatus
  const format = clean(attributes.subtype)
  const ageRating = clean(attributes.ageRatingGuide) ?? clean(attributes.ageRating)
  const mappings = getIds(resource, included)
  const malId = mappings.find((item) => item.site.startsWith("myanimelist/"))?.id
  const aniListId = mappings.find((item) => item.site.startsWith("anilist/"))?.id
  const popularityRank = typeof attributes.popularityRank === "number" ? attributes.popularityRank : undefined
  const ratingRank = typeof attributes.ratingRank === "number" ? attributes.ratingRank : undefined

  return {
    kitsuId: resource.id,
    malId,
    aniListId,
    title,
    titleJapanese,
    titleRomaji,
    alternativeTitles,
    description: clean(attributes.synopsis),
    poster: imageUrl(attributes.posterImage, "large"),
    banner: imageUrl(attributes.coverImage, "large"),
    type: format,
    status,
    episodeCount,
    duration: episodeLength,
    year: Number.isFinite(year) ? year : undefined,
    startDate,
    endDate,
    ageRating,
    genres,
    categories,
    score: Number.isFinite(rating) ? (rating / 10).toFixed(1) : undefined,
    popularityRank,
    ratingRank,
    trailerUrl: trailerId ? `https://www.youtube.com/watch?v=${encodeURIComponent(trailerId)}` : undefined,
  }
}

function getIds(resource: KitsuResource, included: KitsuResource[]) {
  const mappingIds = new Set((resource.relationships?.mappings?.data ?? []).map((item) => item.id).filter((id): id is string => Boolean(id)))
  return included.filter((item) => item.type === "mappings" && item.id && mappingIds.has(item.id)).map((item) => ({
    site: clean(item.attributes?.externalSite)?.toLowerCase(),
    id: clean(item.attributes?.externalId),
  })).filter((item): item is { site: string; id: string } => Boolean(item.site && item.id))
}

function hasExpectedMapping(anime: AnimeSummary, resource: KitsuResource, included: KitsuResource[]) {
  const mappings = getIds(resource, included)
  if (anime.malId && mappings.some((item) => item.site.startsWith("myanimelist/") && item.id === anime.malId)) return true
  if (anime.aniListId && mappings.some((item) => item.site.startsWith("anilist/") && item.id === anime.aniListId)) return true
  if (anime.kitsuId) return anime.kitsuId === resource.id
  return !anime.malId && !anime.aniListId
}

function titleMatches(anime: AnimeSummary, metadata: KitsuMetadata) {
  const expected = normalizeTitle(anime.title)
  return [metadata.title, metadata.titleJapanese, metadata.titleRomaji, ...metadata.alternativeTitles]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeTitle(value) === expected)
}

function isValidatedMatch(anime: AnimeSummary, metadata: KitsuMetadata, resource: KitsuResource, included: KitsuResource[]) {
  if (!titleMatches(anime, metadata) || !hasExpectedMapping(anime, resource, included)) return false
  const existingType = normalizedType(anime.type)
  const kitsuType = normalizedType(metadata.type)
  if (existingType && kitsuType && existingType !== kitsuType) return false
  if (anime.year && metadata.year && Math.abs(anime.year - metadata.year) > 1) return false
  return true
}

function usefulFieldsMissing(anime: AnimeSummary) {
  return !anime.description || !anime.poster || !anime.banner || !anime.type || !anime.status || !anime.episodeCount || !anime.duration || !anime.score || anime.genres.length === 0 || !anime.year || !anime.kitsuId || !anime.titleJapanese || !anime.ageRating
}

function endpoint(path: string, params: Record<string, string>) {
  const url = new URL(`${KITSU_API}${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  return url
}

async function requestJson(url: URL): Promise<{ data?: KitsuResource[] | KitsuResource; included?: KitsuResource[] }> {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.api+json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: SUCCESS_TTL_SECONDS },
  })
  if (!response.ok) {
    if (response.status === 429) cooldownUntil = Math.max(cooldownUntil, Date.now() + COOLDOWN_MS)
    throw new Error(`Kitsu returned ${response.status}`)
  }
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { data?: unknown }).data) && !(payload as { data?: unknown }).data) {
    throw new Error("Invalid Kitsu response")
  }
  return payload as { data?: KitsuResource[] | KitsuResource; included?: KitsuResource[] }
}

async function fetchMatch(anime: AnimeSummary): Promise<KitsuMetadata | null> {
  if (!usefulFieldsMissing(anime)) return null
  if (Date.now() < cooldownUntil) return null
  const cacheKey = anime.kitsuId ? `kitsu:v3:${anime.kitsuId}` : anime.malId ? `mal:v3:${anime.malId}` : anime.aniListId ? `anilist:v3:${anime.aniListId}` : `animexpo:v3:${anime.id}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  const running = inFlight.get(cacheKey)
  if (running) return running

  const promise = (async () => {
    try {
      const include = "mappings,genres,categories"
      const params = {
        include,
        "page[limit]": "10",
        "fields[anime]": "titles,canonicalTitle,abbreviatedTitles,synopsis,averageRating,startDate,endDate,popularityRank,ratingRank,ageRating,ageRatingGuide,subtype,status,posterImage,coverImage,episodeCount,episodeLength,youtubeVideoId,mappings,genres,categories",
        "fields[mappings]": "externalSite,externalId",
        "fields[genres]": "name",
        "fields[categories]": "title",
      }
      let resources: KitsuResource[] = []
      let included: KitsuResource[] = []
      if (anime.kitsuId) {
        const payload = await requestJson(endpoint(`/anime/${encodeURIComponent(anime.kitsuId)}`, { include }))
        const resource = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (resource) resources = [resource]
        included = payload.included ?? []
      } else {
        const payload = await requestJson(endpoint("/anime", { ...params, "filter[text]": anime.title }))
        resources = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : []
        included = payload.included ?? []
      }

      const match = resources.map((resource) => ({ resource, metadata: extractMetadata(resource, included) }))
        .find(({ resource, metadata }) => metadata && isValidatedMatch(anime, metadata, resource, included))
      if (!match?.metadata) {
        failures = 0
        storeCache(cacheKey, { value: null, expiresAt: Date.now() + FAILURE_TTL_MS })
        return null
      }
      failures = 0
      storeCache(cacheKey, { value: match.metadata, expiresAt: Date.now() + SUCCESS_TTL_SECONDS * 1000 })
      return match.metadata
    } catch {
      failures += 1
      if (failures >= FAILURE_THRESHOLD) cooldownUntil = Date.now() + COOLDOWN_MS
      storeCache(cacheKey, { value: null, expiresAt: Date.now() + FAILURE_TTL_MS })
      return null
    } finally {
      inFlight.delete(cacheKey)
    }
  })()
  inFlight.set(cacheKey, promise)
  return promise
}

export async function getKitsuMetadata(anime: AnimeSummary): Promise<KitsuMetadata | null> {
  try {
    return await fetchMatch(anime)
  } catch {
    return null
  }
}


