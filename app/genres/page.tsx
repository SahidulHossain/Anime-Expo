import type { Metadata } from "next"
import Link from "next/link"
import { Search } from "lucide-react"
import { getRecentAnime } from "@/lib/anime-api"

export const revalidate = 600
export const metadata: Metadata = { title: "Genres", description: "Browse anime by genre on ANIME EXPO." }

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Sports", "Supernatural", "Slice of Life"]

export default async function GenresPage() {
  const data = await getRecentAnime(1, 100).catch(() => ({ items: [] }))
  const items = data.items
  const cards = GENRES.map((genre) => {
    const match = items.find((anime) => anime.genres.some((value) => value.toLowerCase() === genre.toLowerCase())) ?? items[GENRES.indexOf(genre) % Math.max(items.length, 1)]
    return { genre, image: match?.banner || match?.poster || "" }
  })

  return (
    <main className="mx-auto min-h-[calc(100dvh-4rem)] max-w-7xl px-4 pb-28 pt-8 sm:pt-12">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">Explore</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Genres</h1>
        </div>
        <Link href="/search" aria-label="Search anime" className="rounded-full border border-white/10 bg-white/[0.04] p-3 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <Search className="size-5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(({ genre, image }) => (
          <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} className="group relative aspect-[1.55] overflow-hidden rounded-2xl border border-white/10 bg-card">
            {image ? <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/25 to-transparent opacity-70" />
            <h2 className="absolute bottom-3 left-3 text-base font-bold text-white sm:bottom-4 sm:left-4 sm:text-lg">{genre}</h2>
          </Link>
        ))}
      </div>
    </main>
  )
}
