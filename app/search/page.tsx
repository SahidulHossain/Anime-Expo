import { Suspense } from "react"
import { SearchClient } from "./search-client"

export const metadata = {
  title: "Search — ANIME EXPO",
  description: "Search for anime by title.",
}

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Suspense fallback={null}>
        <SearchClient />
      </Suspense>
    </main>
  )
}
