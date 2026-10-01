export interface AnimeSummary {
  id: number
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
  isSub: number
  isDub: number
  genres: string[]
}

export interface Episode {
  id: number
  title: string
  number: number
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
