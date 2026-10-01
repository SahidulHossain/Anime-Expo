import { WatchlistClient } from "./watchlist-client"

export const metadata = {
  title: "Watchlist — ANIME EXPO",
  description: "Your saved anime.",
}

export default function WatchlistPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <WatchlistClient />
    </main>
  )
}
