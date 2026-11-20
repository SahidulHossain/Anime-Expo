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
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] overflow-hidden sm:h-[38rem]">
        {anime.banner || anime.poster ? <img src={anime.banner || anime.poster} alt="" aria-hidden className="h-full w-full scale-105 object-cover object-center opacity-45 blur-[1px]" /> : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/20 to-black/65" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_45%,rgba(153,27,27,0.24),transparent_55%)]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 pb-2 pt-4 sm:pb-4 sm:pt-7">
        <div className="mb-5 flex items-center justify-between sm:mb-7"><Link href="/" aria-label="Back home" className="rounded-full border border-white/15 bg-black/40 p-2.5 text-white transition-colors hover:border-primary"><ArrowLeft className="size-5" /></Link><ShareButton animeId={anime.id} title={anime.title} /></div>
        <div className="details-hero flex items-end gap-3 sm:gap-7">
          <div className="w-24 shrink-0 sm:w-44"><PosterImage src={anime.poster} alt={anime.title} className="aspect-[2/3] rounded-lg border border-white/15 shadow-2xl shadow-black/60 sm:rounded-xl" /></div>
          <div className="min-w-0 flex-1 pb-0.5 sm:pb-1"><p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-primary sm:text-[11px]">Anime details</p><h1 className="text-balance text-xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">{anime.title}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-white/75 sm:gap-x-4 sm:text-sm">{anime.score && <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-primary text-primary" />{anime.score}</span>}{anime.year && <span className="inline-flex items-center gap-1"><Calendar className="size-3.5 text-primary" />{anime.year}</span>}{anime.type && <span className="inline-flex items-center gap-1"><Clapperboard className="size-3.5 text-primary" />{anime.type}</span>}{(anime.episodeCount || anime.episodes.length > 0) && <span className="inline-flex items-center gap-1"><Layers3 className="size-3.5 text-primary" />{anime.episodeCount || anime.episodes.length} eps</span>}</div>
            {anime.status && <p className="mt-1 text-[10px] text-white/55 sm:text-xs">{anime.status}</p>}
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">{firstEpisode && <Link href={`/watch/${anime.id}/${firstEpisode.id}?type=${defaultType}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-red-700 to-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-950/40 transition-[filter,transform] hover:brightness-110 active:scale-[0.98] sm:px-5 sm:text-sm"><Play className="size-4 fill-current" />Watch</Link>}<WatchlistButton anime={{ id: anime.id, title: anime.title, poster: anime.poster }} className="min-h-10 border-white/20 bg-black/30 px-3 py-2 text-xs text-white hover:bg-white/10 sm:px-4 sm:text-sm" /></div>
          </div>
        </div>
        <AnimeDetailsTabs anime={anime} related={related} />
      </div>
    </section>
  </main>
}
