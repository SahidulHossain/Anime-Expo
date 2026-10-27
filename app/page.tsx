import Link from "next/link"
import { getRecentAnime } from "@/lib/anime-api"
import { AnimeCarousel } from "@/components/anime-carousel"
import { SectionHeading } from "@/components/section-heading"
import { Hero } from "@/components/home/hero"
import { ContinueWatching } from "@/components/home/continue-watching"
import { getTopRatedPicks, getUpcoming } from "@/lib/home-catalog"
import { getAnimeCatalog } from "@/lib/anime-api"

export const revalidate = 10800

export default async function HomePage() {
  const [pages, catalog] = await Promise.all([
    Promise.all([1, 2, 3].map((page) => getRecentAnime(page, 100).catch(() => ({ items: [], page, perPage: 100, total: 0, totalPages: 0 })))),
    getAnimeCatalog().catch(() => []),
  ])
  const items = pages.flatMap((page) => page.items)

  const uniqueItems = Array.from(new Map(items.map((item) => [item.id, item])).values())
  const featured = uniqueItems.find((a) => a.banner) ?? uniqueItems[0]
  const slides = uniqueItems.filter((a) => a.banner).slice(0, 6)
  const trending = [...uniqueItems]
    .filter((a) => a.score)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 12)
  const latest = uniqueItems.slice(0, 18)
  const movies = uniqueItems.filter((a) => ["movie", "film"].includes(a.type?.trim().toLowerCase() || "")).sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 24)
  const topRated = getTopRatedPicks(catalog)
  const upcoming = getUpcoming(uniqueItems)
  const airing = latest.filter((item) => /airing|ongoing|currently/i.test(item.status ?? ""))

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Nothing to show right now</h1>
        <p className="mt-2 text-muted-foreground">Please try again in a little while.</p>
      </main>
    )
  }

  return (
    <main>
      {featured && <Hero anime={featured} slides={slides.length > 0 ? slides : [featured]} />}

      <ContinueWatching />

      {trending.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <SectionHeading
            title="Trending"
            action={
              <div className="flex items-center gap-3">
                <Link href="/browse" className="text-sm font-medium text-muted-foreground hover:text-primary">Show more</Link>
              </div>
            }
          />
          <AnimeCarousel items={trending} />
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeading title="Popular" action={<Link href="/browse" className="text-sm font-medium text-muted-foreground hover:text-primary">See all</Link>} />
        <AnimeCarousel items={trending.length > 0 ? trending : latest} />
      </section>

      {movies.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <SectionHeading title="Top Movies" action={<Link href="/browse?type=Movie" className="text-sm font-medium text-muted-foreground hover:text-primary">See all</Link>} />
          <AnimeCarousel items={movies} />
        </section>
      )}

      {topRated.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <SectionHeading title="Top Rated" action={<Link href="/top-rated" className="text-sm font-medium text-muted-foreground hover:text-primary">View all</Link>} />
          <AnimeCarousel items={topRated} />
        </section>
      )}

      {airing.length > 0 && <section className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeading title="New Airing" action={<Link href="/browse?page=2" className="text-sm font-medium text-muted-foreground hover:text-primary">View more</Link>} />
        <AnimeCarousel items={airing} />
      </section>}

      {upcoming.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <SectionHeading title="Upcoming" />
          <AnimeCarousel items={upcoming} />
        </section>
      )}

      <div className="mx-auto flex max-w-7xl justify-center px-4 py-8">
        <Link href="/browse" className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-primary/60 hover:text-primary">Browse all anime</Link>
      </div>
    </main>
  )
}
