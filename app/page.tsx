import Link from "next/link"
import { getRecentAnime } from "@/lib/anime-api"
import { AnimeCardGrid } from "@/components/anime-card"
import { SectionHeading } from "@/components/section-heading"
import { Hero } from "@/components/home/hero"
import { ContinueWatching } from "@/components/home/continue-watching"

export const revalidate = 600

export default async function HomePage() {
  const recent = await getRecentAnime(1, 36)
  const items = recent.items

  const featured = items.find((a) => a.banner) ?? items[0]
  const trending = [...items]
    .filter((a) => a.score)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 12)
  const latest = items.slice(0, 18)

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
      {featured && <Hero anime={featured} />}

      <ContinueWatching />

      {trending.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <SectionHeading
            title="Trending Now"
            action={
              <Link href="/browse" className="text-sm font-medium text-muted-foreground hover:text-primary">
                Browse all
              </Link>
            }
          />
          <AnimeCardGrid items={trending} />
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeading
          title="Latest Episodes"
          action={
            <Link href="/browse?page=2" className="text-sm font-medium text-muted-foreground hover:text-primary">
              View more
            </Link>
          }
        />
        <AnimeCardGrid items={latest} />
        <div className="mt-8 flex justify-center">
          <Link
            href="/browse"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-primary/60 hover:text-primary"
          >
            Browse all anime
          </Link>
        </div>
      </section>
    </main>
  )
}
