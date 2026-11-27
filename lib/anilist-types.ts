import type { AnimeSummary } from "@/lib/types"

export type AniListTag = {
  name: string
  description?: string
  category?: string
  rank?: number
  isGeneralSpoiler: boolean
  isMediaSpoiler: boolean
}

export type AniListStudio = { name: string; isMain: boolean }
export type AniListStaff = { name: string; role: string; url?: string }
export type AniListVoiceActor = { name: string; language: string; image?: string; url?: string }
export type AniListCharacter = {
  name: string
  image?: string
  role: string
  url?: string
  voiceActors: AniListVoiceActor[]
}
export type AniListRelatedMedia = {
  id: number
  title: string
  relation: string
  format?: string
  image?: string
  year?: number
  score?: number
  url: string
}
export type AniListRecommendation = {
  id: number
  title: string
  rating: number
  year?: number
  score?: number
  format?: string
  image?: string
  url: string
}
export type AniListRanking = {
  rank: number
  type: string
  format: string
  context: string
  allTime: boolean
  year?: number
  season?: string
}
export type AniListAiring = { episode: number; airingAt: number }
export type AniListScoreDistribution = { score: number; amount: number }

export type AniListMetadata = Partial<AnimeSummary> & {
  aniListAverageScore?: number
  aniListMeanScore?: number
  aniListPopularity?: number
  aniListFavourites?: number
  aniListTrending?: number
  season?: string
  seasonYear?: number
  countryOfOrigin?: string
  sourceType?: string
  aniListUrl?: string
  isAdult?: boolean
}

export type AniListDetails = {
  aniListUrl: string
  airingStatus?: string
  titles?: { english?: string; romaji?: string; native?: string }
  tags: AniListTag[]
  studios: AniListStudio[]
  staff: AniListStaff[]
  characters: AniListCharacter[]
  relations: AniListRelatedMedia[]
  recommendations: AniListRecommendation[]
  rankings: AniListRanking[]
  scoreDistribution: AniListScoreDistribution[]
  nextAiringEpisode?: AniListAiring
  airingSchedule: AniListAiring[]
  trailer?: { id: string; site: string; url: string; thumbnail?: string }
  trailerUrl?: string
  trailerThumbnail?: string
  officialLinks: Array<{ site: string; url: string }>
  externalLinks?: Array<{ site: string; url: string; type?: string }>
}

export type AnimeMetadataResponse = {
  metadata: AnimeSummary | null
  details: AniListDetails | null
}
