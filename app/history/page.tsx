import { HistoryClient } from "./history-client"

export const metadata = {
  title: "History — ANIME EXPO",
  description: "Your watch history and continue watching.",
}

export default function HistoryPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <HistoryClient />
    </main>
  )
}
