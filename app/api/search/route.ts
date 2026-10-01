import { NextResponse } from "next/server"
import { searchAnime } from "@/lib/anime-api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") ?? "").trim()
  const page = Number(searchParams.get("page") ?? "1") || 1

  if (!query) {
    return NextResponse.json({ items: [], page: 1, perPage: 30, total: 0, totalPages: 0 })
  }

  try {
    const data = await searchAnime(query, page)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Search failed." }, { status: 502 })
  }
}
