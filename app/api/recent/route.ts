import { NextResponse } from "next/server"
import { getRecentAnime } from "@/lib/anime-api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get("page") ?? "1") || 1
  const perPage = Number(searchParams.get("per_page") ?? "24") || 24

  try {
    const data = await getRecentAnime(page, perPage)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to load anime." }, { status: 502 })
  }
}
