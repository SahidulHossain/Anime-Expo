export type KitsuMetadata = {
  kitsuId: string
  malId?: string
  aniListId?: string
  title?: string
  titleJapanese?: string
  titleRomaji?: string
  alternativeTitles: string[]
  description?: string
  poster?: string
  banner?: string
  type?: string
  status?: string
  episodeCount?: string
  duration?: string
  year?: number
  startDate?: string
  endDate?: string
  ageRating?: string
  genres: string[]
  categories: string[]
  score?: string
  popularityRank?: number
  ratingRank?: number
  trailerUrl?: string
}
