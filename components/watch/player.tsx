"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react"
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
  Check,
  CircleAlert,
  LoaderCircle,
} from "lucide-react"
import type { AnimeDetail, Episode } from "@/lib/types"
import { recordHistory, useHistory, useWatchlist } from "@/lib/local-store"
import { cn } from "@/lib/utils"
import { useServerFailover } from "@/components/watch/use-server-failover"

type StreamType = "sub" | "dub"

export function Player({ anime, episode }: { anime: AnimeDetail; episode: Episode }) {
  const router = useRouter()
  const params = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const { isSaved, toggle, hydrated } = useWatchlist()
  const { history } = useHistory()

  const requested = params.get("type")
  const [type, setType] = useState<StreamType>(() =>
    requested === "dub" ? "dub" : requested === "sub" ? "sub" : episode.sub ? "sub" : "dub",
  )
  const [autoNext, setAutoNext] = useState(false)
  const [filter, setFilter] = useState("")
  const [episodeLimit, setEpisodeLimit] = useState(120)
  const [episodeLayout, setEpisodeLayout] = useState<"compact" | "expanded">("compact")
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoCleanupRef = useRef<(() => void) | null>(null)
  const playbackPositionRef = useRef(0)

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

  const serverOneUrl = type === "dub" ? episode.dub : episode.sub
  const aniEmbedUrl = anime.aniListId
    ? `https://aniembed.se/e/${encodeURIComponent(anime.aniListId)}/${encodeURIComponent(String(episode.number))}?lang=${type}&autoplay=1`
    : undefined
  const anixoEmbedUrl = anime.aniListId && episode.episodeNumber
    ? `https://anixo.buzz/embed/ani/${encodeURIComponent(anime.aniListId)}/${encodeURIComponent(String(episode.episodeNumber))}?player=custom&track=${type}`
    : undefined
  const servers = useMemo(
    () => [
      { id: "1" as const, url: serverOneUrl },
      { id: "2" as const, url: aniEmbedUrl },
      { id: "3" as const, url: anixoEmbedUrl },
    ],
    [serverOneUrl, aniEmbedUrl, anixoEmbedUrl],
  )
  const failover = useServerFailover({ animeId: anime.id, episodeId: episode.id, type, servers })
  const streamUrl = failover.ready ? failover.activeServer?.url : undefined
  const downloadUrl = anime.malId
    ? `https://zokoanime.video/download/mal/${encodeURIComponent(anime.malId)}/${encodeURIComponent(String(episode.number))}/${type}`
    : undefined
  const hasSub = Boolean(episode.sub || anime.aniListId)
  const hasDub = Boolean(episode.dub || anime.aniListId)

  const handleIframeLoad = useCallback(
    (event: SyntheticEvent<HTMLIFrameElement>) => {
      const frame = event.currentTarget
      if (frame !== iframeRef.current) return
      const token = failover.attemptToken
      failover.markReady(token)
      videoCleanupRef.current?.()
      videoCleanupRef.current = null
      try {
        const video = frame.contentDocument?.querySelector("video")
        if (!video) return
        const onPlaying = () => {
          if (frame !== iframeRef.current) return
          if (video.currentTime > 0) playbackPositionRef.current = video.currentTime
          failover.markPlaying(token)
        }
        const onTimeUpdate = () => {
          if (frame !== iframeRef.current) return
          playbackPositionRef.current = video.currentTime
          if (!video.paused && !video.ended && video.currentTime > 0) failover.markPlaying(token)
        }
        const onError = () => failover.failServer(failover.activeServerId, failover.attemptToken)
        const resume = () => {
          if (frame !== iframeRef.current || playbackPositionRef.current <= 0) return
          video.currentTime = playbackPositionRef.current
          void video.play().catch(() => undefined)
        }
        video.addEventListener("playing", onPlaying)
        video.addEventListener("timeupdate", onTimeUpdate)
        video.addEventListener("loadedmetadata", resume)
        video.addEventListener("error", onError)
        videoCleanupRef.current = () => {
          video.removeEventListener("playing", onPlaying)
          video.removeEventListener("timeupdate", onTimeUpdate)
          video.removeEventListener("loadedmetadata", resume)
          video.removeEventListener("error", onError)
        }
        if (!video.paused && video.currentTime > 0) onPlaying()
      } catch {
        // Cross-origin embeds cannot be inspected; the UI stays in verification mode.
      }
    },
    [failover.activeServerId, failover.attemptToken, failover.failServer, failover.markPlaying, failover.markReady],
  )

  useEffect(() => () => videoCleanupRef.current?.(), [failover.attemptToken, streamUrl])
  useEffect(() => {
    playbackPositionRef.current = 0
  }, [episode.id])

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

  const changeType = useCallback(
    (nextType: StreamType) => {
      setType(nextType)
      router.replace(`/watch/${anime.id}/${episode.id}?type=${nextType}`, { scroll: false })
    },
    [anime.id, episode.id, router],
  )

  const goFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      screen.orientation?.unlock?.()
      return
    }

    try {
      await el.requestFullscreen?.()
      await (screen.orientation as ScreenOrientation & {
        lock?: (orientation: "landscape") => Promise<void>
      }).lock?.("landscape")
    } catch {
      // Orientation locking is unsupported in some browsers and is best-effort.
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
  const visibleEpisodes = filteredEpisodes.slice(0, episodeLimit)

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 pb-8 sm:py-5 sm:pb-10">
      <div className="mb-4 flex items-center gap-3 text-sm">
        <Link
          href={`/anime/${anime.id}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to details
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
        <div className="min-w-0">
          {/* Player */}
          <div ref={containerRef} className="overflow-hidden rounded-xl bg-black shadow-xl shadow-black/25 [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:justify-center [&:fullscreen>div]:aspect-auto [&:fullscreen>div]:h-full [&:fullscreen>div]:w-full">
            <div className="relative aspect-video w-full">
              {streamUrl && failover.phase !== "failed" && failover.phase !== "selecting" ? (
                <>
                  <iframe
                    ref={iframeRef}
                    key={`${episode.id}-${type}-${failover.activeServerId}-${failover.attemptToken}`}
                    src={streamUrl}
                    title={`${anime.title} Episode ${episode.number}`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="no-referrer"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                    onError={() => failover.failServer(failover.activeServerId, failover.attemptToken)}
                    className="absolute inset-0 h-full w-full border-0"
                  />
                  {(failover.phase === "loading" || failover.phase === "switching") && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70" aria-hidden="true">
                      <LoaderCircle className="size-5 animate-spin text-primary" />
                    </div>
                  )}
                </>
              ) : failover.phase === "failed" ? (
                <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center">
                  <CircleAlert className="size-7 text-primary" />
                  <p className="text-sm font-semibold text-white">{failover.statusMessage}</p>
                  <p className="max-w-md text-xs text-white/65">Try another server or retry playback. Your episode and language selection will be kept.</p>
                  <div className="mt-1 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={failover.retryAll} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">
                      <RefreshCw className="size-3.5" /> Retry All Servers
                    </button>
                    <button type="button" onClick={failover.retryCurrent} className="min-h-9 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white">Retry Current Server</button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
                  <LoaderCircle className="size-6 animate-spin text-primary" aria-hidden="true" />
                  <p>{failover.statusMessage || `Loading Server ${failover.activeServerId}…`}</p>
                </div>
              )}
            </div>
          </div>

          {/* Title + controls */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 sm:mt-4 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">
                <Link href={`/anime/${anime.id}`} className="hover:text-primary">
                  {anime.title}
                </Link>
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                Episode {episode.number} — {episode.title}
                {anime.score && <span className="ml-2 text-foreground/80">★ {anime.score}</span>}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggle({ id: anime.id, title: anime.title, poster: anime.poster })}
              aria-pressed={saved}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
                saved
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 hover:bg-secondary",
              )}
            >
              {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
              {saved ? "Saved" : "Watchlist"}
            </button>
          </div>

          {anime.description && (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="w-fit cursor-pointer font-medium text-foreground/80">Synopsis</summary>
              <p className="mt-1.5 max-w-3xl leading-relaxed">{anime.description}</p>
            </details>
          )}

          {/* Toolbar: server select, fullscreen, auto-next */}
          <div className="mt-3 rounded-xl border border-white/10 bg-card/90 p-2 sm:mt-3 sm:p-2.5">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {failover.phase !== "failed" && <p className="flex min-h-8 items-center gap-2 text-xs font-semibold text-foreground" role="status" aria-live="polite">
                  {!failover.ready || failover.phase === "loading" || failover.phase === "switching" ? (
                    <LoaderCircle className="size-3.5 animate-spin text-primary" aria-hidden="true" />
                  ) : failover.phase === "playing" ? (
                    <Check className="size-3.5 text-emerald-400" aria-hidden="true" />
                  ) : null}
                  <span>
                      {!failover.ready
                      ? "Loading player…"
                      : failover.phase === "playing"
                        ? `Playback started · Server ${failover.activeServerId}`
                        : failover.phase === "unverified"
                          ? `Playback not verified · Server ${failover.activeServerId}`
                          : failover.phase === "ready"
                            ? `Connecting to Server ${failover.activeServerId}…`
                            : failover.statusMessage || `Loading Server ${failover.activeServerId}…`}
                  </span>
                </p>}
                {failover.ready && (failover.phase === "ready" || failover.phase === "unverified") && (
                  <button type="button" onClick={failover.switchServer} className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:text-foreground">Video not playing? Switch server</button>
                )}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                <div className="flex gap-1.5" role="group" aria-label="Audio language">
                  {(["sub", "dub"] as const).map((language) => {
                    const supported = language === "sub" ? hasSub : hasDub
                    return (
                      <button key={language} type="button" disabled={!supported} onClick={() => changeType(language)} aria-pressed={type === language} className={cn("min-h-9 min-w-12 rounded-lg border px-2.5 text-[11px] font-bold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40", type === language ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-black/20 text-muted-foreground hover:text-foreground")}>
                        {language}
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3 sm:gap-1.5" role="group" aria-label={`Server selection for ${type.toUpperCase()}`}>
                  {servers.map((serverOption) => (
                    <button
                      key={serverOption.id}
                      type="button"
                      onClick={() => failover.selectServer(serverOption.id)}
                      aria-pressed={failover.activeServerId === serverOption.id}
                      aria-label={`Server ${serverOption.id}${serverOption.id === "1" ? " · FHD" : serverOption.id === "2" ? " · FHD / 4K" : ""}`}
                      className={cn("min-h-11 min-w-0 rounded-lg border px-2 py-1 text-[10px] font-semibold leading-tight transition-colors", failover.activeServerId === serverOption.id ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-black/20 text-muted-foreground hover:text-foreground")}
                    >
                      <span className="block">Server {serverOption.id}</span>
                      {serverOption.id !== "3" && <span className="mt-0.5 block text-[9px] font-medium opacity-75">{serverOption.id === "1" ? "FHD" : "FHD / 4K"}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-2.5 sm:flex sm:flex-wrap sm:items-center">
              {downloadUrl && (
                <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
                  <Download className="size-4" /> Download {type.toUpperCase()}
                </a>
              )}

              <label className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoNext}
                  onChange={(e) => setAutoNext(e.target.checked)}
                  className="size-4 accent-[var(--primary)]"
                />
                Auto-play Next
              </label>

              <button
                type="button"
                onClick={goFullscreen}
                className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-secondary/50 px-3 text-xs font-medium transition-colors hover:bg-secondary sm:ml-auto sm:col-span-1"
              >
                <Maximize className="size-4" />
                Fullscreen
              </button>
            </div>
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
                Next Episode
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
                  {(["compact", "expanded"] as const).map((layout) => <button key={layout} type="button" onClick={() => changeEpisodeLayout(layout)} aria-pressed={episodeLayout === layout} className={cn("rounded px-2 py-1 capitalize transition-colors duration-200", episodeLayout === layout ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{layout}</button>)}
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
                {visibleEpisodes.map((ep) => {
                  const active = ep.id === episode.id
                  const watched = history.some((item) => item.animeId === anime.id && item.episodeId === ep.id)
                  return <button key={ep.id} type="button" onClick={() => goToEpisode(ep)} title={ep.title} aria-label={`Episode ${ep.number}: ${ep.title}`} aria-current={active ? "step" : undefined} className={cn("relative flex min-h-12 items-center rounded-lg border text-left transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] motion-reduce:transform-none", episodeLayout === "compact" ? "justify-center text-sm font-bold" : "justify-start gap-3 px-3 text-sm", active ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-secondary/40 text-foreground hover:border-primary/50")}>{episodeLayout === "expanded" && <span className="font-bold">{ep.number || "?"}</span>}{episodeLayout === "expanded" ? <span className="truncate">{ep.title !== `Episode ${ep.number}` ? ep.title : `Episode ${ep.number}`}</span> : ep.number || "?"}{watched && !active && <span className="absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary" aria-label="Watched" />}</button>
                })}
              </div>
              {filteredEpisodes.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No episodes match your search.</p>}
              {visibleEpisodes.length < filteredEpisodes.length && (
                <button type="button" onClick={() => setEpisodeLimit((limit) => limit + 120)} className="mt-2 min-h-9 w-full rounded-lg border border-white/10 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Show more episodes ({filteredEpisodes.length - visibleEpisodes.length} remaining)
                </button>
              )}
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
