"use client"

import { useCallback, useEffect, useState } from "react"

export interface StoredAnime {
  id: number
  title: string
  poster: string
}

export interface HistoryEntry {
  animeId: number
  animeTitle: string
  poster: string
  episodeId: number
  episodeNumber: number
  type: "sub" | "dub"
  // Progress within the episode (0-1). Best-effort; may be episode-level only.
  progress: number
  updatedAt: number
}

const WATCHLIST_KEY = "ae:watchlist"
const HISTORY_KEY = "ae:history"
const EVENT = "ae:store-change"

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }))
  } catch {
    // storage full or unavailable — ignore
  }
}

function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setValue(read<T>(key, fallback))
    setHydrated(true)
    const sync = () => setValue(read<T>(key, fallback))
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { value, setValue, hydrated }
}

/* ----------------------------- Watchlist ----------------------------- */

export function useWatchlist() {
  const { value, hydrated } = useStored<StoredAnime[]>(WATCHLIST_KEY, [])

  const isSaved = useCallback((id: number) => value.some((a) => a.id === id), [value])

  const toggle = useCallback(
    (anime: StoredAnime) => {
      const current = read<StoredAnime[]>(WATCHLIST_KEY, [])
      const exists = current.some((a) => a.id === anime.id)
      const next = exists ? current.filter((a) => a.id !== anime.id) : [{ ...anime }, ...current]
      write(WATCHLIST_KEY, next)
    },
    [],
  )

  const remove = useCallback((id: number) => {
    const current = read<StoredAnime[]>(WATCHLIST_KEY, [])
    write(
      WATCHLIST_KEY,
      current.filter((a) => a.id !== id),
    )
  }, [])

  return { watchlist: value, hydrated, isSaved, toggle, remove }
}

/* ------------------------------ History ------------------------------ */

export function useHistory() {
  const { value, hydrated } = useStored<HistoryEntry[]>(HISTORY_KEY, [])

  const remove = useCallback((animeId: number) => {
    const current = read<HistoryEntry[]>(HISTORY_KEY, [])
    write(
      HISTORY_KEY,
      current.filter((h) => h.animeId !== animeId),
    )
  }, [])

  const clear = useCallback(() => write(HISTORY_KEY, []), [])

  return { history: value, hydrated, remove, clear }
}

// One entry per anime (latest episode watched) so Continue Watching stays tidy.
export function recordHistory(entry: HistoryEntry) {
  const current = read<HistoryEntry[]>(HISTORY_KEY, [])
  const next = [entry, ...current.filter((h) => h.animeId !== entry.animeId)]
  write(HISTORY_KEY, next.slice(0, 100))
}

export function getEpisodeProgress(animeId: number, episodeId: number): number {
  const current = read<HistoryEntry[]>(HISTORY_KEY, [])
  const match = current.find((h) => h.animeId === animeId && h.episodeId === episodeId)
  return match?.progress ?? 0
}

export function getResumeEntry(animeId: number): HistoryEntry | undefined {
  const current = read<HistoryEntry[]>(HISTORY_KEY, [])
  return current.find((h) => h.animeId === animeId)
}
