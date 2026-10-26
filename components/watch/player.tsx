"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Bookmark,
  BookmarkCheck,
  Search,
  Download,
  RefreshCw,
} from "lucide-react"
import type { AnimeDetail, Episode } from "@/lib/types"
import { recordHistory, useHistory, useWatchlist } from "@/lib/local-store"
import { cn } from "@/lib/utils"

type StreamType = "sub" | "dub"

export function Player({ anime, episode }: { anime: AnimeDetail; episode: Episode }) {
  const router = useRouter()
  const params = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const { isSaved, toggle, hydrated } = useWatchlist()
  const { history } = useHistory()

  const available: StreamType[] = useMemo(() => {
    const list: StreamType[] = []
    if (episode.sub || anime.isSub > 0) list.push("sub")
    if (episode.dub || anime.isDub > 0) list.push("dub")
    return list.length ? list : ["sub"]
  }, [episode, anime])

  const requested = (params.get("type") as StreamType) || available[0]
  const [type, setType] = useState<StreamType>(available.includes(requested) ? requested : available[0])
  const [server, setServer] = useState<1 | 2 | 3>(1)
  const [loadError, setLoadError] = useState(false)
  const [autoNext, setAutoNext] = useState(false)
  const [filter, setFilter] = useState("")
  const [episodeLayout, setEpisodeLayout] = useState<"compact" | "expanded">("compact")

  useEffect(() => {
    const saved = window.localStorage.getItem("animexpo-episode-layout")
    if (saved === "compact" || saved === "expanded") setEpisodeLayout(saved)
  }, [])

  const changeEpisodeLayout = (layout: "compact" | "expanded") => {
    setEpisodeLayout(layout)
    window.localStorage.setItem("animexpo-episode-layout", layout)
  }

  const index = anime.episodes.findIndex((e) => e.id === episode.id)
  const prev = index > 0 ? anime.episodes[index - 1] : undefined
  const next = index >= 0 && index < anime.episodes.length - 1 ? anime.episodes[index + 1] : undefined

  const serverOneUrl = (type === "dub" ? episode.dub : episode.sub) || episode.sub || episode.dub
  const aniEmbedUrl = anime.aniListId
    ? `https://aniembed.se/e/${encodeURIComponent(anime.aniListId)}/${encodeURIComponent(String(episode.number))}?lang=${type}&autoplay=0`
    : undefined
  const anixoEmbedUrl = (anime.aniListId || anime.malId)
    ? `https://anixo.buzz/embed/${anime.aniListId ? "ani" : "mal"}/${encodeURIComponent(String(anime.aniListId || anime.malId))}/${encodeURIComponent(String(episode.number))}?track=${type}&server=1&autoSkipIntro=1&autoSkipOutro=1`
    : undefined
  const streamUrl = server === 2 ? aniEmbedUrl : server === 3 ? anixoEmbedUrl : serverOneUrl
  const downloadUrl = anime.malId
    ? `https://zokoanime.video/download/mal/${encodeURIComponent(anime.malId)}/${encodeURIComponent(String(episode.number))}/${type}`
    : undefined
  const canUseServerTwo = Boolean(anime.aniListId)
  const canUseServerThree = Boolean(anime.aniListId || anime.malId)

  useEffect(() => {
    setLoadError(false)
  }, [streamUrl])

  // Record watch history (episode-level resume) whenever the episode/type changes.
  useEffect(() => {
    recordHistory({
      animeId: anime.id,
      animeTitle: anime.title,
      poster: anime.poster,
      episodeId: episode.id,
      episodeNumber: episode.number,
      type,
      progress: 0.05,
      updatedAt: Date.now(),
    })
  }, [anime, episode, type])

  const goToEpisode = useCallback(
    (ep: Episode) => {
      router.push(`/watch/${anime.id}/${ep.id}?type=${type}`)
    },
    [anime.id, router, type],
  )

  const goFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen?.()
    }
  }, [])

  const saved = hydrated && isSaved(anime.id)

  const filteredEpisodes = useMemo(() => {
    const q = filter.trim()
    if (!q) return anime.episodes
    return anime.episodes.filter(
      (ep) => String(ep.number).includes(q) || ep.title.toLowerCase().includes(q.toLowerCase()),
    )
  }, [anime.episodes, filter])

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3 text-sm">
        <Link
          href={`/anime/${anime.id}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to details
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* Player */}
          <div ref={containerRef} className="overflow-hidden rounded-xl border border-border/60 bg-black">
            <div className="relative aspect-video w-full">
              {streamUrl && !loadError ? (
                <iframe
                  key={`${episode.id}-${type}-${server}`}
                  src={streamUrl}
                  title={`${anime.title} Episode ${episode.number}`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="no-referrer"
                  allowFullScreen
                  onError={() => setLoadError(true)}
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
                  <p>{loadError ? "This stream could not be loaded." : "This episode is not available to stream."}</p>
                  {loadError && (
                    <button type="button" onClick={() => setLoadError(false)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                      <RefreshCw className="size-3.5" /> Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title + controls */}
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                <Link href={`/anime/${anime.id}`} className="hover:text-primary">
                  {anime.title}
                </Link>
              </h1>
              <p className="text-sm text-muted-foreground">
                Episode {episode.number} — {episode.title}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggle({ id: anime.id, title: anime.title, poster: anime.poster })}
              aria-pressed={saved}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                saved
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 hover:bg-secondary",
              )}
            >
              {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
              {saved ? "Saved" : "Watchlist"}
            </button>
          </div>

          {/* Toolbar: server select, fullscreen, auto-next */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:items-center">
              {available.map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-8 text-xs font-bold uppercase text-muted-foreground">{t}</span>
                  <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-border">
                    <button type="button" onClick={() => { setType(t); setServer(1) }} className={cn("flex-1 px-2.5 py-1.5 text-xs font-bold transition-colors", type === t && server === 1 ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground")}>Server 1 · FHD</button>
                    {canUseServerTwo && <button type="button" onClick={() => { setType(t); setServer(2) }} className={cn("flex-1 px-2.5 py-1.5 text-xs font-bold transition-colors", type === t && server === 2 ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground")}>Server 2 · FHD · 4K</button>}
                    {canUseServerThree && <button type="button" onClick={() => { setType(t); setServer(3) }} className={cn("flex-1 px-2.5 py-1.5 text-xs font-bold transition-colors", type === t && server === 3 ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground")}>Server 3 · FHD</button>}
                  </div>
                </div>
              ))}
            </div>

            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/60 hover:text-primary">
                <Download className="size-4" /> Download {type.toUpperCase()}
              </a>
            )}

            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={autoNext}
                onChange={(e) => setAutoNext(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Auto-play next
            </label>

            <button
              type="button"
              onClick={goFullscreen}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
            >
              <Maximize className="size-4" />
              Fullscreen
            </button>
          </div>

          {/* Prev / Next */}
          <div className="mt-4 flex items-center justify-between gap-3">
            {prev ? (
              <button
                type="button"
                onClick={() => goToEpisode(prev)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="size-4" />
                Prev
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button
                type="button"
                onClick={() => goToEpisode(next)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>

        {/* Episode selector */}
        <aside className="lg:max-h-[calc(100dvh-6rem)]">
          <div className="rounded-xl border border-border/60 bg-card">
            <div className="border-b border-border/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold">Episodes</h2>
                  <span className="text-xs text-muted-foreground">{anime.episodes.length}</span>
                </div>
                <div className="flex rounded-md border border-border p-0.5 text-[11px] font-semibold">
                  {(["compact", "expanded"] as const).map((layout) => <button key={layout} type="button" onClick={() => changeEpisodeLayout(layout)} className={cn("rounded px-2 py-1 capitalize", episodeLayout === layout ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{layout}</button>)}
                </div>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Find episode..."
                  aria-label="Find episode"
                  className="h-9 w-full rounded-md border border-border bg-secondary/60 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
                />
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2 lg:max-h-[calc(100dvh-16rem)] [scrollbar-width:thin]">
              <div className={cn("grid gap-2", episodeLayout === "compact" ? "grid-cols-4 min-[380px]:grid-cols-5 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1")}>
                {filteredEpisodes.map((ep) => {
                  const active = ep.id === episode.id
                  const watched = history.some((item) => item.animeId === anime.id && item.episodeId === ep.id)
                  return <button key={ep.id} type="button" onClick={() => goToEpisode(ep)} title={ep.title} aria-label={`Episode ${ep.number}: ${ep.title}`} className={cn("relative flex min-h-12 items-center rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", episodeLayout === "compact" ? "justify-center text-sm font-bold" : "justify-start gap-3 px-3 text-sm", active ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-secondary/40 text-foreground hover:border-primary/50")}>{episodeLayout === "expanded" && <span className="font-bold">{ep.number || "?"}</span>}{episodeLayout === "expanded" ? <span className="truncate">{ep.title !== `Episode ${ep.number}` ? ep.title : `Episode ${ep.number}`}</span> : ep.number || "?"}{watched && !active && <span className="absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary" aria-label="Watched" />}</button>
                })}
              </div>
              {filteredEpisodes.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No episodes match your search.</p>}
            </div>
          </div>
        </aside>
      </div>

      {autoNext && next && <AutoNext key={episode.id} onTrigger={() => goToEpisode(next)} />}
    </main>
  )
}

// Since embedded streams don't expose an "ended" event cross-origin, auto-next
// advances after a countdown once enabled. Users can cancel by toggling it off.
function AutoNext({ onTrigger }: { onTrigger: () => void }) {
  useEffect(() => {
    const id = setTimeout(onTrigger, 24 * 60 * 1000)
    return () => clearTimeout(id)
  }, [onTrigger])
  return null
}
