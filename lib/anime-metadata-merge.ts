import type { AnimeSummary } from "@/lib/types"
import type { AniListMetadata } from "@/lib/anilist-types"
import type { KitsuMetadata } from "@/lib/kitsu-types"

function validText(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim()) && !/^(?:n\/?a|unknown|null|undefined|0)$/i.test(value.trim())
}

function validImage(value: unknown): value is string {
  if (!validText(value)) return false
  try { return new URL(value).protocol === "https:" } catch { return false }
}

function validScore(value: unknown): string | undefined {
  if (!validText(value)) return undefined
  const score = Number(value)
  return Number.isFinite(score) && score > 0 && score <= 10 ? String(value).trim() : undefined
}

function validCount(value: unknown): string | undefined {
  if (!validText(value)) return undefined
  const count = Number(value)
  return Number.isSafeInteger(count) && count > 0 ? String(count) : undefined
}

function validYear(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= new Date().getFullYear() + 5 ? value : undefined
}

function validDate(value: unknown): value is string {
  if (!validText(value) || !/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) return false
  const [year, month = "01", day = "01"] = value.split("-")
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
}

function validDuration(value: unknown): value is string {
  if (!validText(value)) return false
  const amount = Number(value.match(/\d+(?:\.\d+)?/)?.[0])
  return Number.isFinite(amount) && amount > 0
}

function validTrailer(value: unknown): value is string {
  if (!validText(value)) return false
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return false
    if (url.hostname === "youtu.be") return /^[A-Za-z0-9_-]{11}$/.test(url.pathname.slice(1))
    return (url.hostname === "youtube.com" || url.hostname === "www.youtube.com") && /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get("v") ?? "")
  } catch { return false }
}

function normalizeTitle(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^\p{L}\p{N}]+/gu, "")
}

function cleanDescription(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const result = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<br\s*\/?\s*>|<\/p\s*>|<\/div\s*>|<\/li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\*\*|__|~~|`/g, "").replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  return validText(result) ? result.slice(0, 12_000) : undefined
}

function uniqueTitles(values: Array<string | undefined>, excluded: Array<string | undefined>) {
  const primary = excluded.filter((value): value is string => validText(value)).map(normalizeTitle)
  const seen = new Set<string>()
  return values.filter((value): value is string => validText(value)).map((value) => value.trim()).filter((value) => {
    const key = normalizeTitle(value)
    if (!key || primary.includes(key) || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 15)
}

export function mergeAnimeMetadata(anime: AnimeSummary, aniList: AniListMetadata | null, kitsu: KitsuMetadata | null): AnimeSummary {
  const sources: AnimeSummary["metadataSources"] = { ...anime.metadataSources }
  const choose = <T,>(field: string, existing: T | undefined, preferred: T | undefined, fallback: T | undefined, valid: (value: unknown) => value is T): T | undefined => {
    if (valid(existing)) { sources[field] = "AnimExpo"; return existing }
    if (valid(preferred)) { sources[field] = "AniList"; return preferred }
    if (valid(fallback)) { sources[field] = "Kitsu"; return fallback }
    return undefined
  }
  const animeTitle = validText(anime.title) && anime.title !== "Untitled" ? anime.title : undefined
  const aniTitle = validText(aniList?.title) ? aniList.title : undefined
  const kitsuTitle = validText(kitsu?.title) ? kitsu.title : undefined
  const title = choose("title", animeTitle, aniTitle, kitsuTitle, validText) ?? "Untitled"
  const validArray = (value: unknown): value is string[] => Array.isArray(value) && value.some(validText)
  const genres = choose("genres", anime.genres, aniList?.genres, kitsu?.genres, validArray)?.filter(validText) ?? []
  const alternativeTitles = uniqueTitles([
    ...(anime.alternativeTitles ?? []), ...(aniList?.alternativeTitles ?? []), ...(kitsu?.alternativeTitles ?? []),
  ], [title, anime.titleJapanese, aniList?.titleJapanese, anime.titleRomaji, aniList?.titleRomaji])
  const existingScore = validScore(anime.score)
  const aniListScore = validScore(aniList?.score)
  const kitsuScore = validScore(kitsu?.score)
  const score = existingScore ?? aniListScore ?? kitsuScore
  if (score) sources.score = existingScore ? "AnimExpo" : aniListScore ? "AniList" : "Kitsu"
  const chooseImage = (field: string, existing?: string, preferred?: string, fallback?: string) => choose(field, existing, preferred, fallback, validImage)
  const chooseText = (field: string, existing?: string, preferred?: string, fallback?: string) => choose(field, existing, preferred, fallback, validText)
  const chooseCount = (field: string, existing?: string, preferred?: string, fallback?: string) => choose(field, validCount(existing), validCount(preferred), validCount(fallback), (value): value is string => typeof value === "string")
  const chooseDuration = (field: string, existing?: string, preferred?: string, fallback?: string) => choose(field, validDuration(existing) ? existing : undefined, validDuration(preferred) ? preferred : undefined, validDuration(fallback) ? fallback : undefined, (value): value is string => typeof value === "string")
  const chooseDate = (field: string, existing?: string, preferred?: string, fallback?: string) => choose(field, validDate(existing) ? existing : undefined, validDate(preferred) ? preferred : undefined, validDate(fallback) ? fallback : undefined, (value): value is string => typeof value === "string")
  const chooseId = (field: string, existing?: string, preferred?: string, fallback?: string) => choose(field, validText(existing) && /^\d+$/.test(existing) && Number(existing) > 0 ? existing : undefined, validText(preferred) && /^\d+$/.test(preferred) && Number(preferred) > 0 ? preferred : undefined, validText(fallback) && /^\d+$/.test(fallback) && Number(fallback) > 0 ? fallback : undefined, (value): value is string => typeof value === "string")
  const chooseMetric = (field: string, existing?: number, preferred?: number) => choose(field, typeof existing === "number" && Number.isFinite(existing) && existing > 0 ? existing : undefined, typeof preferred === "number" && Number.isFinite(preferred) && preferred > 0 ? preferred : undefined, undefined, (value): value is number => typeof value === "number")
  const chosenYear = choose("year", validYear(anime.year), validYear(aniList?.year), validYear(kitsu?.year), (value): value is number => typeof value === "number")
  const imagePoster = chooseImage("poster", anime.poster, aniList?.poster, kitsu?.poster)
  const chosenDescription = choose("description", cleanDescription(anime.description), cleanDescription(aniList?.description), cleanDescription(kitsu?.description), validText)
  const sourceTitleJapanese = chooseText("titleJapanese", anime.titleJapanese, aniList?.titleJapanese, kitsu?.titleJapanese)
  const sourceTitleRomaji = chooseText("titleRomaji", anime.titleRomaji, aniList?.titleRomaji, kitsu?.titleRomaji)
  const ratingSource = existingScore ? (validText(anime.ratingSource) ? anime.ratingSource : "AnimExpo catalog") : aniListScore ? "AniList average score" : kitsuScore ? "Kitsu" : undefined

  return {
    ...anime,
    title,
    poster: imagePoster ?? "",
    banner: chooseImage("banner", anime.banner, aniList?.banner, kitsu?.banner),
    description: chosenDescription,
    year: chosenYear,
    status: chooseText("status", anime.status, aniList?.status, kitsu?.status),
    score,
    ratingSource,
    episodeCount: chooseCount("episodeCount", anime.episodeCount, aniList?.episodeCount, kitsu?.episodeCount),
    type: chooseText("type", anime.type, aniList?.type, kitsu?.type),
    duration: chooseDuration("duration", anime.duration, aniList?.duration, kitsu?.duration),
    genres,
    categories: choose("categories", anime.categories, undefined, kitsu?.categories, validArray)?.filter(validText) ?? [],
    kitsuId: chooseText("kitsuId", anime.kitsuId, undefined, kitsu?.kitsuId),
    malId: chooseId("malId", anime.malId, aniList?.malId, kitsu?.malId),
    aniListId: chooseId("aniListId", anime.aniListId, aniList?.aniListId, kitsu?.aniListId),
    titleJapanese: sourceTitleJapanese,
    titleRomaji: sourceTitleRomaji,
    alternativeTitles,
    ageRating: chooseText("ageRating", anime.ageRating, undefined, kitsu?.ageRating),
    startDate: chooseDate("startDate", anime.startDate, aniList?.startDate, kitsu?.startDate),
    endDate: chooseDate("endDate", anime.endDate, aniList?.endDate, kitsu?.endDate),
    trailerUrl: choose("trailerUrl", validTrailer(anime.trailerUrl) ? anime.trailerUrl : undefined, validTrailer(aniList?.trailerUrl) ? aniList?.trailerUrl : undefined, validTrailer(kitsu?.trailerUrl) ? kitsu?.trailerUrl : undefined, validTrailer),
    popularityRank: chooseMetric("popularityRank", anime.popularityRank, kitsu?.popularityRank),
    ratingRank: chooseMetric("ratingRank", anime.ratingRank, kitsu?.ratingRank),
    season: chooseText("season", anime.season, aniList?.season, undefined),
    seasonYear: choose("seasonYear", validYear(anime.seasonYear), validYear(aniList?.seasonYear), undefined, (value): value is number => typeof value === "number"),
    countryOfOrigin: choose("countryOfOrigin", /^[A-Z]{2}$/.test(anime.countryOfOrigin ?? "") ? anime.countryOfOrigin : undefined, /^[A-Z]{2}$/.test(aniList?.countryOfOrigin ?? "") ? aniList?.countryOfOrigin : undefined, undefined, (value): value is string => typeof value === "string"),
    sourceType: chooseText("sourceType", anime.sourceType, aniList?.sourceType, undefined),
    aniListAverageScore: aniList?.aniListAverageScore ?? anime.aniListAverageScore,
    aniListMeanScore: aniList?.aniListMeanScore ?? anime.aniListMeanScore,
    aniListPopularity: aniList?.aniListPopularity ?? anime.aniListPopularity,
    aniListFavourites: aniList?.aniListFavourites ?? anime.aniListFavourites,
    aniListTrending: aniList?.aniListTrending ?? anime.aniListTrending,
    aniListUrl: aniList?.aniListUrl ?? anime.aniListUrl,
    metadataSources: sources,
  }
}

export function hasMissingExternalFields(anime: AnimeSummary): boolean {
  return !validText(anime.description) || !validImage(anime.poster) || !validImage(anime.banner) || !validText(anime.type) || !validText(anime.status) || !validCount(anime.episodeCount) || !validText(anime.duration) || !validScore(anime.score) || !validYear(anime.year) || !anime.genres.some(validText) || !validText(anime.titleJapanese) || !validText(anime.ageRating)
}
