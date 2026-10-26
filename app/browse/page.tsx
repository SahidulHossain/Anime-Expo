import type { Metadata } from "next"
import { getRecentAnime, searchAnime } from "@/lib/anime-api"
import { AnimeCardGrid } from "@/components/anime-card"
import { PaginationNav } from "@/components/pagination-nav"

export const revalidate = 10800

export const metadata: Metadata = {
  title: "Browse All Anime",
  description: "Browse the full anime catalog on ANIME EXPO.",
}

const PER_PAGE = 36

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ page?: string; genre?: string; type?: string }> }) {
  const { page: pageParam, genre, type } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1)
  const filter = genre?.trim() || type?.trim()

  let data: Awaited<ReturnType<typeof getRecentAnime>> | null = null
  try {
    data = filter ? await searchAnime(filter, page, PER_PAGE) : await getRecentAnime(page, PER_PAGE)
  } catch {
    data = null
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{genre ? `${genre} Anime` : type ? `${type} Anime` : "Browse All Anime"}</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.total.toLocaleString()} titles &middot; Page {data.page} of {data.totalPages.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {!data ? (
        <div className="py-24 text-center">
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="text-sm text-muted-foreground">Please try again in a moment.</p>
        </div>
      ) : data.items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-lg font-semibold">No anime on this page</p>
        </div>
      ) : (
        <>
          <AnimeCardGrid items={data.items} />
          <PaginationNav page={data.page} totalPages={data.totalPages} hrefFor={(p) => `/browse?page=${p}${genre ? `&genre=${encodeURIComponent(genre)}` : type ? `&type=${encodeURIComponent(type)}` : ""}`} />
        </>
      )}
    </main>
  )
}
