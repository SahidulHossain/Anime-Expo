"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type ServerId = "1" | "2" | "3"
type Phase = "selecting" | "loading" | "ready" | "playing" | "unverified" | "switching" | "failed"

type ServerOption = { id: ServerId; url?: string }
type Health = { failedAt?: number; succeededAt?: number; averageLoadMs?: number }

const STARTUP_TIMEOUT_MS = 10_000
const FAILURE_COOLDOWN_MS = 2 * 60_000
const sessionPreferredServer = new Map<string, ServerId>()
const serverHealth = new Map<string, Health>()

function healthKey(animeId: number, episodeId: number, type: string, serverId: ServerId) {
  return `${animeId}:${episodeId}:${type}:${serverId}`
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

  const chooseBest = useCallback((excluded: Set<ServerId>) => {
    const eligible = servers.filter((server) => server.url && !excluded.has(server.id))
    eligible.sort((a, b) => {
      const score = (id: ServerId) => {
        const health = serverHealth.get(healthKey(animeId, episodeId, type, id))
        const preferred = sessionPreferredServer.get(sessionKey) === id ? -1_000 : 0
        const recentSuccess = health?.succeededAt && Date.now() - health.succeededAt < 30 * 60_000 ? -200 : 0
        const recentFailure = health?.failedAt && Date.now() - health.failedAt < FAILURE_COOLDOWN_MS ? 500 : 0
        const loadPenalty = health?.averageLoadMs ? Math.min(100, health.averageLoadMs / 1_000) : 0
        return preferred + recentSuccess + recentFailure + loadPenalty + Number(id)
      }
      return score(a.id) - score(b.id)
    })
    return eligible[0]
  }, [animeId, episodeId, sessionKey, servers, type])

  const startServer = useCallback((serverId: ServerId) => {
    activeServerRef.current = serverId
    setActiveServerId(serverId)
    attemptStartedAtRef.current = Date.now()
    attemptTokenRef.current += 1
    setAttemptToken(attemptTokenRef.current)
    setPhase("loading")
    setStatusMessage(`Connecting to Server ${serverId}…`)
  }, [])

  const setMode = useCallback((enabled: boolean) => {
    autoModeRef.current = enabled
    setAutoMode(enabled)
    if (!enabled) return
    attemptedRef.current = { key: episodeKey, ids: new Set() }
    const best = chooseBest(new Set())
    if (best) startServer(best.id)
    else {
      setPhase("failed")
      setStatusMessage(`No configured server has a ${type.toUpperCase()} stream for this episode.`)
    }
  }, [chooseBest, episodeKey, startServer, type])

  const selectServer = useCallback((serverId: ServerId) => {
    autoModeRef.current = false
    setAutoMode(false)
    attemptedRef.current.ids.delete(serverId)
    startServer(serverId)
  }, [startServer])

  const markReady = useCallback((expectedToken = attemptTokenRef.current) => {
    if (expectedToken !== attemptTokenRef.current) return
    setPhase((current) => current === "loading" || current === "unverified" ? "ready" : current)
    setStatusMessage(`Player loaded · Server ${activeServerRef.current}`)
  }, [])

  const markUnverified = useCallback((expectedToken = attemptTokenRef.current) => {
    if (expectedToken !== attemptTokenRef.current) return
    setPhase((current) => current === "loading" ? "unverified" : current)
    setStatusMessage(`Playback unverified · Server ${activeServerRef.current}`)
  }, [])

  const markPlaying = useCallback((expectedToken = attemptTokenRef.current) => {
    if (expectedToken !== attemptTokenRef.current) return
    const serverId = activeServerRef.current
    const key = healthKey(animeId, episodeId, type, serverId)
    const previous = serverHealth.get(key)
    const loadTime = Math.max(0, Date.now() - attemptStartedAtRef.current)
    sessionPreferredServer.set(sessionKey, serverId)
    serverHealth.set(key, {
      succeededAt: Date.now(),
      averageLoadMs: previous?.averageLoadMs ? Math.round(previous.averageLoadMs * 0.7 + loadTime * 0.3) : loadTime,
    })
    setPhase("playing")
    setStatusMessage(`Playback detected · Server ${serverId}`)
  }, [animeId, episodeId, sessionKey, type])

  const failServer = useCallback((serverId = activeServerRef.current, expectedToken = attemptTokenRef.current) => {
    if (expectedToken !== attemptTokenRef.current || attemptedRef.current.key !== episodeKey || attemptedRef.current.ids.has(serverId)) return
    attemptedRef.current.ids.add(serverId)
    const key = healthKey(animeId, episodeId, type, serverId)
    serverHealth.set(key, { ...serverHealth.get(key), failedAt: Date.now() })

    if (!autoModeRef.current) {
      setPhase("failed")
      setStatusMessage(`Server ${serverId} is unavailable.`)
      return
    }

    const next = chooseBest(attemptedRef.current.ids)
    if (!next) {
      setPhase("failed")
      setStatusMessage("Unable to connect to available servers")
      return
    }
    setPhase("switching")
    setStatusMessage(`Server ${serverId} unavailable · Switching…`)
    startServer(next.id)
  }, [animeId, chooseBest, episodeId, episodeKey, startServer, type])

  const switchServer = useCallback(() => {
    const current = activeServerRef.current
    attemptedRef.current.ids.add(current)
    const next = chooseBest(attemptedRef.current.ids)
    if (next) {
      autoModeRef.current = false
      setAutoMode(false)
      startServer(next.id)
    } else {
      setPhase("failed")
      setStatusMessage("No other configured server is available for this episode.")
    }
  }, [chooseBest, startServer])

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
      setStatusMessage(`No server has a ${type.toUpperCase()} stream for this episode.`)
    }
  }, [chooseBest, episodeKey, servers, startServer, type])

  useEffect(() => {
    if (phase !== "loading" && phase !== "ready") return
    const expectedToken = attemptToken
    const timeout = window.setTimeout(() => markUnverified(expectedToken), STARTUP_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [attemptToken, markUnverified, phase])

  const activeServer = servers.find((server) => server.id === activeServerId)
  const ready = initializedRef.current && attemptedRef.current.key === episodeKey
  return {
    ready, activeServerId, activeServer, autoMode, phase, statusMessage, attemptToken,
    selectServer, setMode, markReady, markUnverified, markPlaying, failServer, switchServer, retryCurrent, retryAll,
  }
}
