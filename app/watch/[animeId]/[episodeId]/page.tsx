import { notFound } from "next/navigation"
import { getAnimeDetail } from "@/lib/anime-api"
import { Player } from "@/components/watch/player"

export const revalidate = 600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animeId: string; episodeId: string }>
}) {
  const { animeId, episodeId } = await params
  const anime = await getAnimeDetail(animeId)
  const ep = anime?.episodes.find((e) => String(e.id) === episodeId)
  if (!anime) return { title: "Watch — ANIME EXPO" }
  return {
    title: `${anime.title}${ep ? ` — Episode ${ep.number}` : ""} — ANIME EXPO`,
    description: `Watch ${anime.title} online.`,
  }
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ animeId: string; episodeId: string }>
}) {
  const { animeId, episodeId } = await params
  const anime = await getAnimeDetail(animeId)
  if (!anime) notFound()

  const current = anime.episodes.find((e) => String(e.id) === episodeId)
  if (!current) notFound()

  return <Player anime={anime} episode={current} />
}
