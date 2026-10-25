import type { Metadata } from "next"
import Link from "next/link"
import { Search } from "lucide-react"
import { getRecentAnime } from "@/lib/anime-api"

export const revalidate = 600
export const metadata: Metadata = { title: "Genres", description: "Browse anime by genre on AnimExpo." }

const GENRES = [
  ["Action", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212040_ChatGPT-PimIw6kvwHkbdWm2ZoqHwkXsjqDyjN.jpg"],
  ["Adventure", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212058_ChatGPT-eRGPh4A8XJZbOmUvAKFxJa05RY7zsy.jpg"],
  ["Comedy", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212112_ChatGPT-2k3wjsJEq1smb1JRzK9Atqpwu5zTkw.jpg"],
  ["Drama", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212138_ChatGPT-DCmwSG7ZWCVL9tJcngvAse76mzV22f.jpg"],
  ["Fantasy", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212154_ChatGPT-pmUUWP2XK1wQKLmu5b4co8Lcmr9vOv.jpg"],
  ["Horror", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212214_ChatGPT-QBMqQKSnST7Jz6NVl2GFPjZcG0OLSh.jpg"],
  ["Mystery", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212214_ChatGPT-QBMqQKSnST7Jz6NVl2GFPjZcG0OLSh.jpg"],
  ["Romance", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212224_ChatGPT-rbWBiuxAty5M5CZ4xdBfPgCwBbc0rW.jpg"],
  ["Sports", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212234_ChatGPT-wIG9TKbHGoKntIVHlvLpKRzj7jlPHN.jpg"],
  ["Isekai", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212355_ChatGPT-pQZzJNHyYnNm2s9tEoF1UeTmgVWZLe.jpg"],
  ["Supernatural", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212257_ChatGPT-d4Nm0jJUcj0AS6HsOtvnDZpqQIPO3p.jpg"],
  ["Martial Arts", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212247_ChatGPT-feb9pNbT7OF9cNdxjdRtnzRhnBKOih.jpg"],
  ["Superhero", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212310_ChatGPT-LF4U5weLVOJp10gisxYpdrnQKnvkBX.jpg"],
  ["Slice of Life", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212320_ChatGPT-BGN1WuukjNU0LG8Fph6IrQlEKmGK8n.jpg"],
  ["Sci-Fi", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212138_ChatGPT-DCmwSG7ZWCVL9tJcngvAse76mzV22f.jpg"],
  ["Thriller", "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SmartSelect_20261025_212214_ChatGPT-QBMqQKSnST7Jz6NVl2GFPjZcG0OLSh.jpg"],
] as const

export default async function GenresPage() {
  const data = await getRecentAnime(1, 100).catch(() => ({ items: [] }))
  const cards = GENRES.map(([genre, preferred]) => {
    const match = data.items.find((anime) => anime.genres.some((value) => value.toLowerCase() === genre.toLowerCase()))
    return { genre, image: match?.banner || match?.poster || preferred }
  })

  return (
    <main className="mx-auto min-h-[calc(100dvh-4rem)] max-w-7xl px-4 pb-28 pt-8 sm:pt-12">
      <div className="mb-7 flex items-center justify-between">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">Explore</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Genres</h1></div>
        <Link href="/search" aria-label="Search anime" className="rounded-full border border-white/10 bg-white/[0.04] p-3 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"><Search className="size-5" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(({ genre, image }) => <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-card">
          <img src={image} alt={`${genre} anime`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <h2 className="absolute bottom-3 left-3 text-base font-bold text-white sm:bottom-4 sm:left-4 sm:text-lg">{genre}</h2>
        </Link>)}
      </div>
    </main>
  )
}
