import { NextResponse } from "next/server"
import { getAnimeDetail } from "@/lib/anime-api"
import { getAniListEnrichment } from "@/lib/anilist-metadata"
import { mergeAnimeMetadata, hasMissingExternalFields } from "@/lib/anime-metadata-merge"
import { getKitsuMetadata } from "@/lib/kitsu-metadata"
import type { AnimeMetadataResponse } from "@/lib/anilist-types"

function cacheHeaders(hasEnrichment: boolean, includeDetails: boolean, isAiring = false) {
  const maxAge = hasEnrichment ? includeDetails ? isAiring ? 60 : 7 * 24 * 60 * 60 : 14 * 24 * 60 * 60 : 60
  const stale = hasEnrichment ? includeDetails && isAiring ? 30 : 24 * 60 * 60 : 60
  return { "Cache-Control": `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${stale}` }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const includeDetails = searchParams.get("details") === "1"
  const refreshAiring = includeDetails && searchParams.get("refresh") === "1"
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ metadata: null, details: null } satisfies AnimeMetadataResponse, { status: 400 })

  try {
    const anime = await getAnimeDetail(id)
    if (!anime) return NextResponse.json({ metadata: null, details: null } satisfies AnimeMetadataResponse, { status: 404, headers: cacheHeaders(false, includeDetails) })
    const enrichment = await getAniListEnrichment(anime, includeDetails, refreshAiring)
    const aniList = enrichment?.metadata ?? null
    const withAniList = mergeAnimeMetadata(anime, aniList, null)
    const kitsu = hasMissingExternalFields(withAniList) ? await getKitsuMetadata(withAniList) : null
    const metadata = mergeAnimeMetadata(anime, aniList, kitsu)
    const body: AnimeMetadataResponse = { metadata, details: enrichment?.details ?? null }
    return NextResponse.json(body, { headers: refreshAiring ? { "Cache-Control": "no-store" } : cacheHeaders(Boolean(aniList || kitsu), includeDetails, enrichment?.details?.airingStatus === "RELEASING") })
  } catch {
    return NextResponse.json({ metadata: null, details: null } satisfies AnimeMetadataResponse, { headers: refreshAiring ? { "Cache-Control": "no-store" } : cacheHeaders(false, includeDetails) })
  }
}
