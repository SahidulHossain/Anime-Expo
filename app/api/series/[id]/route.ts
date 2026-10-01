import { NextResponse } from "next/server"
import { getAnimeDetail } from "@/lib/anime-api"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const data = await getAnimeDetail(id)
    if (!data) {
      return NextResponse.json({ error: "Anime not found." }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to load anime." }, { status: 502 })
  }
}
