import { NextResponse } from "next/server"
import { getAnimeDetail } from "@/lib/anime-api"
import { getKitsuMetadata } from "@/lib/kitsu-metadata"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ metadata: null })

  try {
    const anime = await getAnimeDetail(id)
    if (!anime) return NextResponse.json({ metadata: null })
    const metadata = await getKitsuMetadata(anime)
    const maxAge = metadata ? 86_400 : 60
    const staleWhileRevalidate = metadata ? 3_600 : 60
    return NextResponse.json({ metadata }, { headers: { "Cache-Control": `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}` } })
  } catch {
    return NextResponse.json({ metadata: null }, { headers: { "Cache-Control": "private, max-age=60" } })
  }
}
