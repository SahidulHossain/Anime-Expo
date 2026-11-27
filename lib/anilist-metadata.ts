import "server-only"

import { unstable_cache } from "next/cache"
import type { AnimeSummary } from "@/lib/types"
import type { AniListAiring, AniListCharacter, AniListDetails, AniListMetadata, AniListRanking, AniListRecommendation, AniListRelatedMedia, AniListScoreDistribution, AniListStaff, AniListStudio, AniListTag, AniListVoiceActor } from "@/lib/anilist-types"

const ENDPOINT = "https://graphql.anilist.co"
const SUMMARY_TTL_SECONDS = 14 * 24 * 60 * 60
const DETAILS_TTL_SECONDS = 7 * 24 * 60 * 60
const FAILURE_TTL_MS = 10 * 60 * 1000
const REQUEST_TIMEOUT_MS = 4_000
const FAILURE_THRESHOLD = 3
const COOLDOWN_MS = 30 * 60 * 1000
const CACHE_LIMIT = 500

export type AniListLookup = Pick<AnimeSummary, "id" | "title" | "aniListId" | "malId" | "type" | "year" | "titleJapanese" | "titleRomaji" | "alternativeTitles">

type RawTitle = { english?: string | null; romaji?: string | null; native?: string | null; userPreferred?: string | null }
type RawDate = { year?: number | null; month?: number | null; day?: number | null } | null
type RawImage = { extraLarge?: string | null; large?: string | null; medium?: string | null }
type RawMedia = {
  id: number
  idMal?: number | null
  isAdult?: boolean | null
  title?: RawTitle | null
  description?: string | null
  startDate?: RawDate
  endDate?: RawDate
  season?: string | null
  seasonYear?: number | null
  format?: string | null
  status?: string | null
  episodes?: number | null
  duration?: number | null
  countryOfOrigin?: string | null
  coverImage?: RawImage | null
  bannerImage?: string | null
  genres?: Array<string | null> | null
  synonyms?: Array<string | null> | null
  averageScore?: number | null
  meanScore?: number | null
  popularity?: number | null
  favourites?: number | null
  trending?: number | null
  source?: string | null
  tags?: Array<{ name?: string | null; description?: string | null; category?: string | null; rank?: number | null; isGeneralSpoiler?: boolean | null; isMediaSpoiler?: boolean | null; isAdult?: boolean | null } | null> | null
  studios?: { edges?: Array<{ isMain?: boolean | null; node?: { name?: string | null; isAnimationStudio?: boolean | null } | null } | null> | null } | null
  staff?: { edges?: Array<{ role?: string | null; node?: { name?: { full?: string | null } | null; siteUrl?: string | null } | null } | null> | null } | null
  characters?: { edges?: Array<{ role?: string | null; node?: { name?: { full?: string | null } | null; image?: { large?: string | null; medium?: string | null } | null; siteUrl?: string | null } | null; voiceActors?: Array<{ name?: { full?: string | null } | null; languageV2?: string | null; image?: { large?: string | null; medium?: string | null } | null; siteUrl?: string | null } | null> | null } | null> | null } | null
  relations?: { edges?: Array<{ relationType?: string | null; node?: { id?: number | null; type?: string | null; format?: string | null; isAdult?: boolean | null; title?: RawTitle | null; coverImage?: RawImage | null; siteUrl?: string | null } | null } | null> | null } | null
  recommendations?: { nodes?: Array<{ rating?: number | null; mediaRecommendation?: { id?: number | null; type?: string | null; format?: string | null; isAdult?: boolean | null; title?: RawTitle | null; coverImage?: RawImage | null; siteUrl?: string | null } | null } | null> | null } | null
  rankings?: Array<{ rank?: number | null; type?: string | null; format?: string | null; context?: string | null; allTime?: boolean | null; year?: number | null; season?: string | null } | null> | null
  stats?: { scoreDistribution?: Array<{ score?: number | null; amount?: number | null } | null> | null } | null
  nextAiringEpisode?: { episode?: number | null; airingAt?: number | null } | null
  airingSchedule?: { nodes?: Array<{ episode?: number | null; airingAt?: number | null } | null> | null } | null
  trailer?: { id?: string | null; site?: string | null; thumbnail?: string | null } | null
  externalLinks?: Array<{ site?: string | null; url?: string | null; type?: string | null; isDisabled?: boolean | null } | null> | null
  siteUrl?: string | null
}

type AniListPayload = { metadata: AniListMetadata; details?: AniListDetails }
type CacheEntry = { value: AniListPayload | null; expiresAt: number }
const resultCache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<AniListPayload | null>>()
let consecutiveFailures = 0
let cooldownUntil = 0

const CORE_FIELDS = `
  id idMal isAdult
  title { english romaji native userPreferred }
  description(asHtml: false)
  startDate { year month day }
  endDate { year month day }
  season seasonYear format status episodes duration countryOfOrigin
  coverImage { extraLarge large medium }
  bannerImage genres synonyms
  averageScore meanScore popularity favourites trending source
  trailer { id site thumbnail }
  siteUrl
`

const SUMMARY_BY_ID_QUERY = `query AniListById($id: Int!) { Media(id: $id, type: ANIME) { ${CORE_FIELDS} } }`
const SUMMARY_BY_MAL_QUERY = `query AniListByMalId($idMal: Int!) { Media(idMal: $idMal, type: ANIME) { ${CORE_FIELDS} } }`
const SUMMARY_BY_TITLE_QUERY = `query AniListByTitle($search: String!) { Page(page: 1, perPage: 10) { media(search: $search, type: ANIME, isAdult: false, sort: [SEARCH_MATCH]) { ${CORE_FIELDS} } } }`

const DETAILS_QUERY = `query AniListAnimeDetails($id: Int!) {
  Media(id: $id, type: ANIME) {
    ${CORE_FIELDS}
    tags { name description category rank isGeneralSpoiler isMediaSpoiler isAdult }
    studios { edges { isMain node { name isAnimationStudio } } }
    staff(perPage: 10) { edges { role node { name { full } siteUrl } } }
    characters(perPage: 12) {
      edges {
        role
        node { name { full } image { large medium } siteUrl }
        voiceActors { name { full } languageV2 image { large medium } siteUrl }
      }
    }
    relations { edges { relationType node { id type format isAdult title { english romaji native } coverImage { extraLarge large medium } siteUrl } } }
    recommendations(perPage: 15) { nodes { rating mediaRecommendation { id type format isAdult title { english romaji native } coverImage { extraLarge large medium } siteUrl } } }
    rankings { rank type format context allTime year season }
    stats { scoreDistribution { score amount } }
    nextAiringEpisode { episode airingAt }
    airingSchedule(notYetAired: true, perPage: 5) { nodes { episode airingAt } }
    trailer { id site thumbnail }
    externalLinks { site url type isDisabled }
  }
}`

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const text = value.trim()
  return text && !/^(?:n\/?a|unknown|null|undefined|0)$/i.test(text) ? text : undefined
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

function validUrl(value: unknown): string | undefined {
  const candidate = clean(value)
  if (!candidate) return undefined
  try {
    const url = new URL(candidate)
    return url.protocol === "https:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function image(value: RawImage | null | undefined): string | undefined {
  return validUrl(value?.extraLarge) ?? validUrl(value?.large) ?? validUrl(value?.medium)
}

function yearOf(date: RawDate | undefined): number | undefined {
  return positiveInteger(date?.year)
}

function dateString(date: RawDate | undefined): string | undefined {
  const year = yearOf(date)
  if (!year) return undefined
  const month = positiveInteger(date?.month)
  const day = positiveInteger(date?.day)
  if (month && month > 12) return undefined
  if (day && day > 31) return undefined
  return [String(year), month ? String(month).padStart(2, "0") : undefined, day ? String(day).padStart(2, "0") : undefined].filter(Boolean).join("-")
}

function cleanDescription(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const text = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<br\s*\/?\s*>|<\/p\s*>|<\/div\s*>|<\/li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/!?(\[([^\]]+)\])\([^)]*\)/g, "$2")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\*\*|__|~~|`/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text && !/^(?:n\/?a|unknown|null|undefined)$/i.test(text) ? text.slice(0, 12_000) : undefined
}

function normalizeTitle(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^\p{L}\p{N}]+/gu, "")
}

function normalizedFormat(value?: string | null): string | undefined {
  const format = value?.trim().toLowerCase().replace(/[_-]+/g, " ")
  if (!format) return undefined
  if (/movie|film/.test(format)) return "movie"
  if (/ova/.test(format)) return "ova"
  if (/ona/.test(format)) return "ona"
  if (/special/.test(format)) return "special"
  if (/tv short/.test(format)) return "tv short"
  if (/tv|series/.test(format)) return "tv"
  return undefined
}

function titleVariants(media: RawMedia): string[] {
  return [media.title?.english, media.title?.romaji, media.title?.native, ...(media.synonyms ?? [])].map(clean).filter((item): item is string => Boolean(item))
}

function exactTitleMatch(lookup: AniListLookup, media: RawMedia): boolean {
  const expected = [lookup.title, lookup.titleJapanese, lookup.titleRomaji, ...(lookup.alternativeTitles ?? [])].map(clean).filter((item): item is string => Boolean(item)).map(normalizeTitle)
  const actual = titleVariants(media).map(normalizeTitle)
  return expected.some((title) => title && actual.includes(title))
}

function matchesExpectedFormat(lookup: AniListLookup, media: RawMedia): boolean {
  const expected = normalizedFormat(lookup.type)
  const actual = normalizedFormat(media.format)
  return !expected || !actual || expected === actual
}

function mapMetadata(media: RawMedia): AniListMetadata {
  const titles = media.title
  const averageScore = positiveInteger(media.averageScore)
  const meanScore = positiveInteger(media.meanScore)
  const score = averageScore && averageScore <= 100 ? (averageScore / 10).toFixed(1) : undefined
  const parsedStatus = clean(media.status)?.toUpperCase()
  const status = parsedStatus === "FINISHED" ? "Finished" : parsedStatus === "RELEASING" ? "Currently Airing" : parsedStatus === "NOT_YET_RELEASED" ? "Upcoming" : parsedStatus === "HIATUS" ? "On Hiatus" : parsedStatus === "CANCELLED" ? "Cancelled" : undefined
  const format = clean(media.format)?.replaceAll("_", " ")
  const alternatives = Array.from(new Set([...(media.synonyms ?? []), titles?.english, titles?.romaji, titles?.native].map(clean).filter((title): title is string => Boolean(title))))
  const startYear = yearOf(media.startDate) ?? positiveInteger(media.seasonYear)
  const trailerId = clean(media.trailer?.id)
  const trailerSite = clean(media.trailer?.site)?.toLowerCase()
  const trailerUrl = trailerSite === "youtube" && trailerId && /^[A-Za-z0-9_-]{11}$/.test(trailerId) ? `https://www.youtube.com/watch?v=${encodeURIComponent(trailerId)}` : undefined

  return {
    aniListId: String(media.id),
    malId: positiveInteger(media.idMal) ? String(media.idMal) : undefined,
    title: clean(titles?.english) ?? clean(titles?.romaji) ?? clean(titles?.native),
    titleJapanese: clean(titles?.native),
    titleRomaji: clean(titles?.romaji),
    alternativeTitles: alternatives,
    description: cleanDescription(media.description),
    poster: image(media.coverImage),
    banner: validUrl(media.bannerImage),
    year: startYear,
    startDate: dateString(media.startDate),
    endDate: dateString(media.endDate),
    type: format,
    status,
    episodeCount: positiveInteger(media.episodes) ? String(media.episodes) : undefined,
    duration: positiveInteger(media.duration) ? `${media.duration} min` : undefined,
    genres: Array.from(new Set((media.genres ?? []).map(clean).filter((genre): genre is string => Boolean(genre)))),
    score,
    ratingSource: score ? "AniList average score" : undefined,
    trailerUrl,
    season: clean(media.season),
    seasonYear: positiveInteger(media.seasonYear),
    countryOfOrigin: clean(media.countryOfOrigin),
    sourceType: clean(media.source),
    aniListAverageScore: averageScore,
    aniListMeanScore: meanScore,
    aniListPopularity: positiveInteger(media.popularity),
    aniListFavourites: positiveInteger(media.favourites),
    aniListTrending: positiveInteger(media.trending),
    popularityRank: undefined,
    aniListUrl: validUrl(media.siteUrl),
    isAdult: media.isAdult === true,
  }
}

function candidatesFromPage(value: unknown): RawMedia[] {
  if (!value || typeof value !== "object") return []
  const page = (value as { Page?: { media?: unknown[] } }).Page
  return Array.isArray(page?.media) ? page.media.filter((item): item is RawMedia => Boolean(item && typeof item === "object")) : []
}

async function postGraphQL<T>(query: string, variables: Record<string, string | number>): Promise<T> {
  if (Date.now() < cooldownUntil) throw new Error("AniList cooldown active")
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  })
  if (response.status === 429) cooldownUntil = Math.max(cooldownUntil, Date.now() + COOLDOWN_MS)
  if (!response.ok) throw new Error(`AniList returned ${response.status}`)
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== "object") throw new Error("Invalid AniList response")
  const result = payload as { data?: T; errors?: Array<{ message?: string }> }
  if (result.errors?.length || !result.data) throw new Error(result.errors?.[0]?.message || "AniList returned no data")
  consecutiveFailures = 0
  return result.data
}

async function queryMedia(query: string, variables: Record<string, string | number>): Promise<RawMedia | null> {
  const data = await postGraphQL<{ Media?: RawMedia | null }>(query, variables)
  return data.Media ?? null
}

async function findMedia(lookup: AniListLookup): Promise<RawMedia | null> {
  const aniListId = Number(lookup.aniListId)
  const malId = Number(lookup.malId)
  const hasAniListId = Number.isSafeInteger(aniListId) && aniListId > 0
  const hasMalId = Number.isSafeInteger(malId) && malId > 0
  let media: RawMedia | null = null
  if (hasAniListId) {
    media = await queryMedia(SUMMARY_BY_ID_QUERY, { id: aniListId })
    if (media && media.isAdult === true) return null
    if (media && lookup.malId && String(media.idMal ?? "") !== lookup.malId) return null
  }
  if (!media && hasMalId) {
    media = await queryMedia(SUMMARY_BY_MAL_QUERY, { idMal: malId })
    if (media && (media.isAdult === true || String(media.idMal ?? "") !== lookup.malId)) return null
  }
  if (media) return media.isAdult === false ? media : null
  if (hasAniListId || hasMalId) return null

  const search = clean(lookup.title)
  if (!search) return null
  const data = await postGraphQL<{ Page?: { media?: RawMedia[] | null } }>(SUMMARY_BY_TITLE_QUERY, { search })
  const matches = (data.Page?.media ?? []).filter((candidate) =>
    candidate.isAdult === false && exactTitleMatch(lookup, candidate) && matchesExpectedFormat(lookup, candidate) &&
    (!lookup.year || !candidate.seasonYear && !yearOf(candidate.startDate) || lookup.year === (positiveInteger(candidate.seasonYear) ?? yearOf(candidate.startDate))),
  )
  return matches.length === 1 ? matches[0] : null
}

function positiveCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined
}

function safeSiteUrl(value: unknown, fallback: string): string {
  const parsed = validUrl(value)
  return parsed ?? fallback
}

function mapDetails(media: RawMedia): AniListDetails {
  const aniListUrl = safeSiteUrl(media.siteUrl, `https://anilist.co/anime/${media.id}`)
  const tags: AniListTag[] = (media.tags ?? []).filter((tag): tag is NonNullable<typeof tag> => Boolean(tag && !tag.isAdult)).map((tag) => ({
    name: clean(tag.name) ?? "",
    description: cleanDescription(tag.description),
    category: clean(tag.category),
    rank: positiveCount(tag.rank),
    isGeneralSpoiler: tag.isGeneralSpoiler === true,
    isMediaSpoiler: tag.isMediaSpoiler === true,
  })).filter((tag) => Boolean(tag.name) && !tag.isGeneralSpoiler && !tag.isMediaSpoiler).sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0)).slice(0, 20)
  const studios: AniListStudio[] = (media.studios?.edges ?? []).flatMap((edge) => edge?.node?.name ? [{ name: edge.node.name, isMain: edge.isMain === true }] : []).sort((a, b) => Number(b.isMain) - Number(a.isMain))
  const staff: AniListStaff[] = (media.staff?.edges ?? []).flatMap((edge) => {
    const name = clean(edge?.node?.name?.full)
    const role = clean(edge?.role)
    return name && role ? [{ name, role, url: validUrl(edge?.node?.siteUrl) }] : []
  })
  const characters: AniListCharacter[] = (media.characters?.edges ?? []).flatMap((edge) => {
    const name = clean(edge?.node?.name?.full)
    if (!name) return []
    const voiceActors: AniListVoiceActor[] = (edge?.voiceActors ?? []).flatMap((actor) => {
      const actorName = clean(actor?.name?.full)
      if (!actorName) return []
      const language = clean(actor?.languageV2)
      return [{ name: actorName, language: language ?? "Unknown", image: validUrl(actor?.image?.large) ?? validUrl(actor?.image?.medium), url: validUrl(actor?.siteUrl) }]
    }).filter((actor, index, actors) => actors.findIndex((candidate) => candidate.name === actor.name && candidate.language === actor.language) === index).slice(0, 3)
    const imageUrl = validUrl(edge?.node?.image?.large) ?? validUrl(edge?.node?.image?.medium)
    return [{ name, image: imageUrl, role: clean(edge?.role) ?? "Supporting", url: validUrl(edge?.node?.siteUrl), voiceActors }]
  })
  const related = (media.relations?.edges ?? []).flatMap((edge): AniListRelatedMedia[] => {
    const node = edge?.node
    const title = clean(node?.title?.english) ?? clean(node?.title?.romaji) ?? clean(node?.title?.native)
    const id = positiveInteger(node?.id)
    if (!node || node.type !== "ANIME" || node.isAdult !== false || !title || !id) return []
    return [{ id, title, relation: clean(edge?.relationType) ?? "RELATED", format: clean(node.format)?.replaceAll("_", " "), image: image(node.coverImage), url: safeSiteUrl(node.siteUrl, `https://anilist.co/anime/${id}`) }]
  })
  const recommendations: AniListRecommendation[] = (media.recommendations?.nodes ?? []).flatMap((entry): AniListRecommendation[] => {
    const node = entry?.mediaRecommendation
    const title = clean(node?.title?.english) ?? clean(node?.title?.romaji) ?? clean(node?.title?.native)
    const id = positiveInteger(node?.id)
    const rating = typeof entry?.rating === "number" && Number.isFinite(entry.rating) ? entry.rating : 0
    if (!node || node.type !== "ANIME" || node.isAdult !== false || !title || !id || rating <= 0) return []
    return [{ id, title, rating, format: clean(node.format)?.replaceAll("_", " "), image: image(node.coverImage), url: safeSiteUrl(node.siteUrl, `https://anilist.co/anime/${id}`) }]
  }).sort((a, b) => b.rating - a.rating).slice(0, 12)
  const rankings: AniListRanking[] = (media.rankings ?? []).flatMap((item): AniListRanking[] => {
    const rank = positiveCount(item?.rank)
    const type = clean(item?.type)
    const format = clean(item?.format)
    const context = clean(item?.context)
    if (!rank || !type || !format || !context) return []
    return [{ rank, type, format, context, allTime: item?.allTime === true, year: positiveCount(item?.year), season: clean(item?.season) }]
  })
  const scoreDistribution: AniListScoreDistribution[] = (media.stats?.scoreDistribution ?? []).flatMap((item): AniListScoreDistribution[] => {
    const score = positiveCount(item?.score)
    const amount = positiveCount(item?.amount)
    return score && amount ? [{ score, amount }] : []
  })
  const nextAiring: AniListAiring | undefined = positiveCount(media.nextAiringEpisode?.episode) && positiveCount(media.nextAiringEpisode?.airingAt) ? { episode: media.nextAiringEpisode!.episode!, airingAt: media.nextAiringEpisode!.airingAt! } : undefined
  const airingSchedule: AniListAiring[] = (media.airingSchedule?.nodes ?? []).flatMap((item) => positiveCount(item?.episode) && positiveCount(item?.airingAt) ? [{ episode: item!.episode!, airingAt: item!.airingAt! }] : []).sort((a, b) => a.airingAt - b.airingAt).slice(0, 5)
  const trailerId = clean(media.trailer?.id)
  const trailerSite = clean(media.trailer?.site)?.toLowerCase()
  const trailerUrl = trailerSite === "youtube" && trailerId && /^[A-Za-z0-9_-]{11}$/.test(trailerId) ? `https://www.youtube.com/watch?v=${encodeURIComponent(trailerId)}` : undefined
  const trailerThumbnail = trailerUrl ? validUrl(media.trailer?.thumbnail) : undefined
  const officialLinks = (media.externalLinks ?? []).flatMap((link) => {
    if (!link || link.isDisabled) return []
    const site = clean(link.site)
    const url = validUrl(link.url)
    if (!site || !url || !/official|website/i.test(`${link.type ?? ""} ${site}`)) return []
    return [{ site, url }]
  }).slice(0, 5)

  return {
    aniListUrl,
    tags,
    studios,
    staff,
    characters,
    relations: related,
    recommendations,
    rankings,
    scoreDistribution,
    nextAiringEpisode: nextAiring,
    airingSchedule,
    trailer: trailerUrl && trailerId && trailerSite ? { id: trailerId, site: trailerSite, url: trailerUrl, thumbnail: trailerThumbnail } : undefined,
    trailerUrl,
    trailerThumbnail,
    officialLinks,
  }
}

const loadCachedSummary = unstable_cache(async (lookup: AniListLookup): Promise<AniListPayload> => {
  const media = await findMedia(lookup)
  if (!media || media.isAdult !== false) throw new Error("AniList match unavailable")
  return { metadata: mapMetadata(media) }
}, ["animexpo-anilist-summary-v1"], { revalidate: SUMMARY_TTL_SECONDS })

const loadCachedDetails = unstable_cache(async (lookup: AniListLookup): Promise<AniListPayload> => {
  const mediaId = Number(lookup.aniListId)
  let media: RawMedia | null = Number.isSafeInteger(mediaId) && mediaId > 0 ? await queryMedia(DETAILS_QUERY, { id: mediaId }) : null
  if (!media) {
    const summary = await findMedia(lookup)
    if (!summary || summary.isAdult !== false) throw new Error("AniList match unavailable")
    media = await queryMedia(DETAILS_QUERY, { id: summary.id })
  }
  if (!media || media.isAdult !== false) throw new Error("AniList details unavailable")
  return { metadata: mapMetadata(media), details: mapDetails(media) }
}, ["animexpo-anilist-details-v1"], { revalidate: DETAILS_TTL_SECONDS })

function storeResult(key: string, entry: CacheEntry) {
  if (resultCache.size >= CACHE_LIMIT) {
    const now = Date.now()
    for (const [cachedKey, cached] of resultCache) {
      if (cached.expiresAt <= now) resultCache.delete(cachedKey)
      if (resultCache.size < CACHE_LIMIT) break
    }
    if (resultCache.size >= CACHE_LIMIT) {
      const first = resultCache.keys().next().value
      if (first) resultCache.delete(first)
    }
  }
  resultCache.set(key, entry)
}

function cacheKey(lookup: AniListLookup, details: boolean) {
  return `${details ? "detail" : "summary"}:${lookup.aniListId || ""}:${lookup.malId || ""}:${lookup.id}`
}

export async function getAniListEnrichment(anime: AniListLookup, includeDetails = false): Promise<AniListPayload | null> {
  const lookup: AniListLookup = {
    id: anime.id,
    title: anime.title,
    aniListId: anime.aniListId,
    malId: anime.malId,
    type: anime.type,
    year: anime.year,
    titleJapanese: anime.titleJapanese,
    titleRomaji: anime.titleRomaji,
    alternativeTitles: anime.alternativeTitles,
  }
  const key = cacheKey(lookup, includeDetails)
  const cached = resultCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  if (Date.now() < cooldownUntil) return null
  const active = inFlight.get(key)
  if (active) return active

  const promise = (async () => {
    try {
      const result = includeDetails ? await loadCachedDetails(lookup) : await loadCachedSummary(lookup)
      consecutiveFailures = 0
      storeResult(key, { value: result, expiresAt: Date.now() + (includeDetails ? DETAILS_TTL_SECONDS : SUMMARY_TTL_SECONDS) * 1000 })
      return result
    } catch {
      consecutiveFailures += 1
      if (consecutiveFailures >= FAILURE_THRESHOLD) cooldownUntil = Date.now() + COOLDOWN_MS
      storeResult(key, { value: null, expiresAt: Date.now() + FAILURE_TTL_MS })
      return null
    } finally {
      inFlight.delete(key)
    }
  })()
  inFlight.set(key, promise)
  return promise
}
