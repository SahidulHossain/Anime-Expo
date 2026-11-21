"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type ServerId = "1" | "2" | "3"
type Phase = "selecting" | "loading" | "verifying" | "playing" | "switching" | "failed"

type ServerOption = {
  id: ServerId
  url?: string
}

type Health = {
  failedAt?: number
  succeededAt?: number
  averageLoadMs?: number
}

const STARTUP_TIMEOUT_MS = 35_000
const FAILURE_COOLDOWN_MS = 2 * 60_000
const sessionPreferredServer = new Map<string, ServerId>()
const serverHealth = new Map<string, Health>()

function serverHealthKey(animeId: number, type: string, serverId: ServerId) {
  return `${animeId}:${type}:${serverId}`
}

export function useServerFailover({
  animeId,
  episodeId,
  type,
  servers,
}: {
  animeId: number
  episodeId: number
  type: "sub" | "dub"
  servers: ServerOption[]
}) {
  const sessionKey = `${animeId}:${type}`
  const episodeKey = `${sessionKey}:${episodeId}`
  const [autoMode, setAutoMode] = useState(true)
  const autoModeRef = useRef(true)
  const [activeServerId, setActiveServerId] = useState<ServerId>(
    () => sessionPreferredServer.get(sessionKey) ?? servers.find((server) => server.url)?.id ?? "1",
  )
  const activeServerRef = useRef<ServerId>(activeServerId)
  const [phase, setPhase] = useState<Phase>("selecting")
  const [statusMessage, setStatusMessage] = useState("")
  const [attemptToken, setAttemptToken] = useState(0)
  const attemptTokenRef = useRef(0)
  const attemptStartedAtRef = useRef(0)
  const attemptedRef = useRef<{ key: string; ids: Set<ServerId> }>({ key: episodeKey, ids: new Set() })
  const initializedRef = useRef(false)

  const chooseBest = useCallback(
    (excluded: Set<ServerId>) => {
      const eligible = servers.filter((server) => server.url && !excluded.has(server.id))
      eligible.sort((a, b) => {
        const score = (id: ServerId) => {
          const health = serverHealth.get(serverHealthKey(animeId, type, id))
          const preferred = sessionPreferredServer.get(sessionKey) === id ? -1_000 : 0
          const recentSuccess = health?.succeededAt && Date.now() - health.succeededAt < 30 * 60_000 ? -200 : 0
          const recentFailure = health?.failedAt && Date.now() - health.failedAt < FAILURE_COOLDOWN_MS ? 500 : 0
          const loadPenalty = health?.averageLoadMs ? Math.min(100, health.averageLoadMs / 1_000) : 0
          return preferred + recentSuccess + recentFailure + loadPenalty + Number(id)
        }
        return score(a.id) - score(b.id)
      })
      return eligible[0]
    },
    [animeId, sessionKey, servers, type],
  )

  const startServer = useCallback((serverId: ServerId) => {
    activeServerRef.current = serverId
    setActiveServerId(serverId)
    attemptStartedAtRef.current = Date.now()
    attemptTokenRef.current += 1
    setAttemptToken(attemptTokenRef.current)
    setPhase("loading")
    setStatusMessage("")
  }, [])

  const setMode = useCallback(
    (enabled: boolean) => {
      autoModeRef.current = enabled
      setAutoMode(enabled)
      if (enabled) {
        attemptedRef.current = { key: episodeKey, ids: new Set() }
        const best = chooseBest(new Set())
        if (best) startServer(best.id)
        else {
          setPhase("failed")
          setStatusMessage(`No configured server has a ${type.toUpperCase()} stream for this episode.`)
        }
      }
    },
    [chooseBest, episodeKey, startServer, type],
  )

  const selectServer = useCallback(
    (serverId: ServerId) => {
      attemptedRef.current.ids.delete(serverId)
      autoModeRef.current = false
      setAutoMode(false)
      startServer(serverId)
    },
    [startServer],
  )

  const markVerifying = useCallback(() => {
    setPhase((current) => (current === "loading" ? "verifying" : current))
  }, [])

  const markPlaying = useCallback(() => {
    const serverId = activeServerRef.current
    const key = serverHealthKey(animeId, type, serverId)
    const previous = serverHealth.get(key)
    const loadTime = Math.max(0, Date.now() - attemptStartedAtRef.current)
    sessionPreferredServer.set(sessionKey, serverId)
    serverHealth.set(key, {
      succeededAt: Date.now(),
      averageLoadMs: previous?.averageLoadMs
        ? Math.round(previous.averageLoadMs * 0.7 + loadTime * 0.3)
        : loadTime,
    })
    setPhase("playing")
    setStatusMessage(`Playback started · Server ${serverId}`)
  }, [animeId, sessionKey, type])

  const failServer = useCallback(
    (serverId = activeServerRef.current, expectedToken = attemptTokenRef.current) => {
      if (
        expectedToken !== attemptTokenRef.current ||
        attemptedRef.current.key !== episodeKey ||
        attemptedRef.current.ids.has(serverId)
      ) return
      attemptedRef.current.ids.add(serverId)
      const key = serverHealthKey(animeId, type, serverId)
      serverHealth.set(key, { ...serverHealth.get(key), failedAt: Date.now() })

      if (!autoModeRef.current) {
        setPhase("failed")
        setStatusMessage(`Server ${serverId} is unavailable.`)
        return
      }

      const next = chooseBest(attemptedRef.current.ids)
      if (!next) {
        setPhase("failed")
        setStatusMessage("Unable to play this episode right now. All available servers failed. Try again or select a server manually.")
        return
      }

      setPhase("switching")
      startServer(next.id)
      setStatusMessage(`Server ${serverId} failed · Trying Server ${next.id}…`)
    },
    [animeId, chooseBest, episodeKey, startServer, type],
  )

  const switchServer = useCallback(() => {
    const current = activeServerRef.current
    attemptedRef.current.ids.add(current)
    const key = serverHealthKey(animeId, type, current)
    serverHealth.set(key, { ...serverHealth.get(key), failedAt: Date.now() })
    const next = chooseBest(attemptedRef.current.ids)
    if (next) {
      autoModeRef.current = false
      setAutoMode(false)
      startServer(next.id)
      setStatusMessage(`Trying Server ${next.id}…`)
    } else {
      setPhase("failed")
      setStatusMessage("No other configured server is available for this episode.")
    }
  }, [animeId, chooseBest, startServer, type])

  const retryCurrent = useCallback(() => {
    attemptedRef.current.ids.delete(activeServerRef.current)
    startServer(activeServerRef.current)
  }, [startServer])

  const retryAll = useCallback(() => {
    attemptedRef.current = { key: episodeKey, ids: new Set() }
    autoModeRef.current = true
    setAutoMode(true)
    const best = chooseBest(new Set())
    if (best) startServer(best.id)
    else {
      setPhase("failed")
      setStatusMessage("No configured server is available for this language.")
    }
  }, [chooseBest, episodeKey, startServer])

  useEffect(() => {
    if (initializedRef.current && attemptedRef.current.key === episodeKey) return
    initializedRef.current = true
    attemptedRef.current = { key: episodeKey, ids: new Set() }
    setStatusMessage("")
    const selected = autoModeRef.current
      ? chooseBest(new Set())
      : servers.find((server) => server.id === activeServerRef.current && server.url)
    if (selected) startServer(selected.id)
    else {
      setPhase("failed")
      setStatusMessage(
        autoModeRef.current
          ? `No server has a ${type.toUpperCase()} stream for this episode.`
          : `The selected server has no ${type.toUpperCase()} stream for this episode. Choose another server or return to Auto.`,
      )
    }
  }, [chooseBest, episodeKey, servers, startServer, type])

  useEffect(() => {
    if (phase === "playing" || phase === "failed" || phase === "selecting") return
    const serverId = activeServerId
    const expectedToken = attemptToken
    const remaining = Math.max(0, STARTUP_TIMEOUT_MS - (Date.now() - attemptStartedAtRef.current))
    const timeout = window.setTimeout(() => failServer(serverId, expectedToken), remaining)
    return () => window.clearTimeout(timeout)
  }, [activeServerId, attemptToken, failServer, phase])

  const activeServer = servers.find((server) => server.id === activeServerId)
  const ready = initializedRef.current && attemptedRef.current.key === episodeKey
  return {
    ready,
    activeServerId,
    activeServer,
    autoMode,
    phase,
    statusMessage,
    attemptToken,
    selectServer,
    setMode,
    markVerifying,
    markPlaying,
    failServer,
    switchServer,
    retryCurrent,
    retryAll,
  }
}
