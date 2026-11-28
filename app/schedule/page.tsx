import type { Metadata } from "next"
import { ScheduleClient } from "./schedule-client"

export const metadata: Metadata = {
  title: "Anime Schedule — ANIME EXPO",
  description: "Browse upcoming anime episodes with live AniList airing times in your local timezone.",
}

export default function SchedulePage() {
  return <ScheduleClient />
}
