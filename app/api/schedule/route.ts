import { NextResponse } from "next/server"
import { getAnimeCatalog } from "@/lib/anime-api"

const ENDPOINT = "https://graphql.anilist.co"
const PAGE_SIZE = 50
const PAGE_LIMIT = 4
const WINDOW_SECONDS = 14 * 24 * 60 * 60

const QUERY = `query AiringSchedule($page: Int!, $perPage: Int!, $from: Int!, $to: Int!) {
  Page(page: $page, perPage: $perPage) {
    airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
      airingAt episode
      media {
        id isAdult format status seasonYear
        title { english romaji native }
        coverImage { extraLarge large medium }
        bannerImage
        nextAiringEpisode { airingAt episode }
      }
    }
  }
}`

type ScheduleNode = {
  airingAt: number
  episode: number
  media: {
    id: number
    isAdult?: boolean
    format?: string | null
    status?: string | null
    seasonYear?: number | null
    title?: { english?: string | null; romaji?: string | null; native?: string | null } | null
    coverImage?: { extraLarge?: string | null; large?: string | null; medium?: string | null } | null
    bannerImage?: string | null
    nextAiringEpisode?: { airingAt?: number | null; episode?: number | null } | null
  }
}

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000)
    const to = now + WINDOW_SECONDS
    const pages = await Promise.all(Array.from({ length: PAGE_LIMIT }, async (_, index) => {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: QUERY, variables: { page: index + 1, perPage: PAGE_SIZE, from: now - 24 * 60 * 60, to } }),
        next: { revalidate: 15 * 60 },
        signal: AbortSignal.timeout(8_000),
      })
      if (!response.ok) throw new Error(`AniList schedule request failed: ${response.status}`)
      const payload = await response.json()
      if (payload.errors?.length) throw new Error("AniList schedule query failed")
      return payload.data?.Page?.airingSchedules ?? []
    }))

    const catalog = await getAnimeCatalog().catch(() => [])
    const animeIds = new Map(catalog.flatMap((anime) => anime.aniListId ? [[String(anime.aniListId), anime.id] as const] : []))
    const seen = new Set<string>()
    const entries = pages.flat().flatMap((node: ScheduleNode) => {
      const airingAt = Number(node?.airingAt)
      const episode = Number(node?.episode)
      const media = node?.media
      if (!media || media.isAdult !== false || !Number.isSafeInteger(airingAt) || !Number.isSafeInteger(episode) || airingAt <= now - 24 * 60 * 60 || airingAt > to) return []
      const id = animeIds.get(String(media.id))
      if (!id) return []
      const key = `${media.id}:${episode}`
      if (seen.has(key)) return []
      seen.add(key)
      return [{
        id,
        aniListId: media.id,
        title: media.title?.english || media.title?.romaji || media.title?.native || "Untitled anime",
        cover: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null,
        banner: media.bannerImage || null,
        episode,
        airingAt,
        format: media.format?.replaceAll("_", " ") || null,
        year: media.seasonYear || null,
        status: media.status || null,
        nextAiringEpisode: media.nextAiringEpisode ? {
          airingAt: media.nextAiringEpisode.airingAt || null,
          episode: media.nextAiringEpisode.episode || null,
        } : null,
      }]
    }).sort((a, b) => a.airingAt - b.airingAt)

    return NextResponse.json({ entries, updatedAt: Date.now() }, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=1800" },
    })
  } catch {
    return NextResponse.json({ entries: [], error: "Schedule is temporarily unavailable." }, {
      status: 503,
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120" },
    })
  }
}
