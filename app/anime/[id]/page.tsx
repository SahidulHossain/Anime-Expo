import { notFound } from "next/navigation"
import { getAnimeDetail, getRecentAnime } from "@/lib/anime-api"
import { AnimeDetailExperience } from "@/components/anime/anime-detail-experience"

export const revalidate = 10800

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const anime = await getAnimeDetail(id)
  if (!anime) return { title: "Not found — AnimExpo" }
  return { title: `${anime.title} — AnimExpo`, description: anime.description?.slice(0, 160) ?? `Watch ${anime.title} online.` }
}

export default async function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const anime = await getAnimeDetail(id)
  if (!anime) notFound()
  const related = await getRecentAnime(1, 24).then((data) => data.items.filter((item) => item.id !== anime.id)).catch(() => [])

  return <AnimeDetailExperience anime={anime} related={related} />
}
