import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Play, Star, Calendar, Clapperboard, Layers3 } from "lucide-react"
import { getAnimeDetail, getRecentAnime } from "@/lib/anime-api"
import { PosterImage } from "@/components/poster-image"
import { WatchlistButton } from "@/components/anime/watchlist-button"
import { AnimeDetailsTabs } from "@/components/anime/anime-details-tabs"
import { ShareButton } from "@/components/anime/share-button"

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
  const related = await getRecentAnime(1, 100).then((data) => data.items.filter((item) => item.id !== anime.id)).catch(() => [])
  const firstEpisode = anime.episodes[0]
  const defaultType = anime.isSub > 0 ? "sub" : "dub"

  return <main className="min-h-screen bg-background">
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] overflow-hidden">
        {anime.banner || anime.poster ? <img src={anime.banner || anime.poster} alt="" aria-hidden className="h-full w-full scale-105 object-cover object-center opacity-35 blur-[2px]" /> : null}
        <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/65 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/75 via-transparent to-background/70" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 pb-4 pt-6 sm:pt-10">
        <div className="mb-8 flex items-center justify-between"><Link href="/" aria-label="Back home" className="rounded-full border border-white/10 bg-black/30 p-2.5 text-white hover:border-primary"><ArrowLeft className="size-5" /></Link><ShareButton animeId={anime.id} title={anime.title} /></div>
        <div className="details-hero flex flex-row items-end gap-4 sm:gap-8">
          <div className="w-24 shrink-0 sm:w-52 sm:translate-y-2"><PosterImage src={anime.poster} alt={anime.title} className="aspect-[2/3] rounded-xl border border-white/10 shadow-2xl shadow-black/50 sm:rounded-2xl" /></div>
          <div className="min-w-0 flex-1 pb-1"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary sm:text-xs">Anime details</p><h1 className="text-balance text-2xl font-black leading-tight tracking-tight sm:text-5xl">{anime.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-2.5 gap-y-2 text-xs text-muted-foreground sm:gap-x-4 sm:text-sm">{anime.score && <span className="inline-flex items-center gap-1.5"><Star className="size-4 fill-primary text-primary" />{anime.score}</span>}{anime.year && <span className="inline-flex items-center gap-1.5"><Calendar className="size-4 text-primary" />{anime.year}</span>}{anime.type && <span className="inline-flex items-center gap-1.5"><Clapperboard className="size-4 text-primary" />{anime.type}</span>}{(anime.episodeCount || anime.episodes.length > 0) && <span className="inline-flex items-center gap-1.5"><Layers3 className="size-4 text-primary" />{anime.episodeCount || anime.episodes.length} episodes</span>}{anime.status && <span>{anime.status}</span>}</div>
            <div className="mt-5 flex flex-wrap gap-2">{firstEpisode && <Link href={`/watch/${anime.id}/${firstEpisode.id}?type=${defaultType}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"><Play className="size-4 fill-current" />Watch</Link>}<WatchlistButton anime={{ id: anime.id, title: anime.title, poster: anime.poster }} className="px-5 py-2.5" /></div>
          </div>
        </div>
        <AnimeDetailsTabs anime={anime} related={related} />
      </div>
    </section>
  </main>
}
