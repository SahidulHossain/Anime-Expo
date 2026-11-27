export interface AnimeSummary {
  id: number
  animExpoId?: number
  anikotoSeriesId?: string
  title: string
  poster: string
  banner?: string
  description?: string
  year?: number
  status?: string
  score?: string
  episodeCount?: string
  rating?: string
  type?: string
  duration?: string
  malId?: string
  aniListId?: string
  kitsuId?: string
  titleJapanese?: string
  titleRomaji?: string
  alternativeTitles?: string[]
  ageRating?: string
  startDate?: string
  endDate?: string
  trailerUrl?: string
  ratingSource?: string
  popularityRank?: number
  ratingRank?: number
  season?: string
  seasonYear?: number
  countryOfOrigin?: string
  sourceType?: string
  aniListAverageScore?: number
  aniListMeanScore?: number
  aniListPopularity?: number
  aniListFavourites?: number
  aniListTrending?: number
  aniListUrl?: string
  metadataSources?: Record<string, "AnimExpo" | "AniList" | "Kitsu">
  isSub: number
  isDub: number
  genres: string[]
  categories?: string[]
}

export interface Episode {
  id: number
  title: string
  number: number
  episodeNumber?: number
  episodeEmbedId?: string
  sub?: string
  dub?: string
}

export interface AnimeDetail extends AnimeSummary {
  episodes: Episode[]
}

export interface Paginated<T> {
  items: T[]
  page: number
  perPage: number
  total: number
  totalPages: number
}
