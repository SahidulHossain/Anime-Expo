import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AnimeCardGrid } from "@/components/anime-card"
import { getAnimeCatalog } from "@/lib/anime-api"
import { getTopRatedPicks, TOP_RATED_TITLES } from "@/lib/home-catalog"

export const revalidate = 10800

export const metadata = {
  title: "Top Rated Picks — ANIME EXPO",
  description: "Browse AnimExpo's curated top rated anime and films.",
}

export default async function TopRatedPage() {
  const catalog = await getAnimeCatalog().catch(() => [])
  const items = getTopRatedPicks(catalog)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" /> Back home
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">Top Rated Picks</h1>
          <p className="mt-2 text-sm text-muted-foreground">{items.length} of {TOP_RATED_TITLES.length} curated titles available in the catalog.</p>
        </div>
      </div>
      {items.length > 0 ? <AnimeCardGrid items={items} /> : <div className="rounded-xl border border-border/60 p-10 text-center text-sm text-muted-foreground">No verified curated titles are available right now.</div>}
    </main>
  )
}
