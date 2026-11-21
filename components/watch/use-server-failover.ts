"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type ServerId = "1" | "2" | "3"
type Phase = "idle" | "loading" | "connecting" | "playing" | "unknown" | "confirmed_error" | "switching"
type ServerOption = { id: ServerId; url?: string }

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
  const episodeKey = `${animeId}:${episodeId}:${type}`
  const [activeServerId, setActiveServerId] = useState<ServerId>("1")
  const activeServerRef = useRef<ServerId>("1")
  const [phase, setPhase] = useState<Phase>("idle")
  const [statusMessage, setStatusMessage] = useState("")
  const [attemptToken, setAttemptToken] = useState(0)
  const attemptTokenRef = useRef(0)
  const attemptedRef = useRef<{ key: string; ids: Set<ServerId> }>({ key: episodeKey, ids: new Set() })
  const confirmedErrorsRef = useRef<{ key: string; ids: Set<ServerId> }>({ key: episodeKey, ids: new Set() })
  const initializedRef = useRef(false)

  const updatePhase = useCallback((next: Phase) => {
    setPhase(next)
  }, [])

  const startServer = useCallback((serverId: ServerId, switching = false) => {
    activeServerRef.current = serverId
    setActiveServerId(serverId)
    attemptTokenRef.current += 1
    setAttemptToken(attemptTokenRef.current)
    updatePhase(switching ? "switching" : "loading")
    setStatusMessage(`${switching ? "Switching to" : "Loading"} Server ${serverId}…`)
  }, [updatePhase])

  const chooseNext = useCallback((excluded: Set<ServerId>) =>
    servers.find((server) => server.url && !excluded.has(server.id),
  ), [servers])

  const selectServer = useCallback((serverId: ServerId) => {
    attemptedRef.current = { key: episodeKey, ids: new Set() }
    confirmedErrorsRef.current = { key: episodeKey, ids: new Set() }
    const selected = servers.find((server) => server.id === serverId && server.url)
    if (!selected) {
      activeServerRef.current = serverId
      setActiveServerId(serverId)
      setStatusMessage("This server has no stream for the selected episode.")
      updatePhase("confirmed_error")
      return
    }
    startServer(serverId)
  }, [episodeKey, servers, startServer, updatePhase])

  const markReady = useCallback((expectedToken = attemptTokenRef.current) => {
    if (expectedToken !== attemptTokenRef.current) return
    updatePhase("unknown")
    setStatusMessage(`Server ${activeServerRef.current} connected; playback status is unavailable.`)
  }, [updatePhase])

  const markUnverified = markReady

  const markPlaying = useCallback((expectedToken = attemptTokenRef.current) => {
    if (expectedToken !== attemptTokenRef.current) return
    attemptedRef.current = { key: episodeKey, ids: new Set() }
    confirmedErrorsRef.current = { key: episodeKey, ids: new Set() }
    updatePhase("playing")
    setStatusMessage(`Playback started · Server ${activeServerRef.current}`)
  }, [episodeKey, updatePhase])

  const failServer = useCallback((serverId = activeServerRef.current, expectedToken = attemptTokenRef.current) => {
    if (expectedToken !== attemptTokenRef.current || attemptedRef.current.key !== episodeKey || attemptedRef.current.ids.has(serverId)) return
    attemptedRef.current.ids.add(serverId)
    if (confirmedErrorsRef.current.key !== episodeKey) {
      confirmedErrorsRef.current = { key: episodeKey, ids: new Set() }
    }
    confirmedErrorsRef.current.ids.add(serverId)
    const next = chooseNext(attemptedRef.current.ids)
    if (next) {
      updatePhase("switching")
      startServer(next.id, true)
      return
    }
    const availableServers = servers.filter((server) => server.url)
    if (availableServers.length > 0 && availableServers.every((server) => confirmedErrorsRef.current.ids.has(server.id))) {
      updatePhase("confirmed_error")
      setStatusMessage("We couldn’t play this episode using the available servers.")
      return
    }
    updatePhase("unknown")
    setStatusMessage("No other server is available to try. Switch servers manually if playback is not working.")
  }, [chooseNext, episodeKey, servers, startServer, updatePhase])

  const switchServer = useCallback(() => {
    const current = activeServerRef.current
    const excluded = new Set(attemptedRef.current.key === episodeKey ? attemptedRef.current.ids : [])
    excluded.add(current)
    const next = chooseNext(excluded)
    if (next) {
      attemptedRef.current = { key: episodeKey, ids: excluded }
      startServer(next.id, true)
    }
  }, [chooseNext, episodeKey, startServer])

  const retryCurrent = useCallback(() => {
    attemptedRef.current = { key: episodeKey, ids: new Set() }
    confirmedErrorsRef.current = { key: episodeKey, ids: new Set() }
    startServer(activeServerRef.current)
  }, [episodeKey, startServer])

  const retryAll = useCallback(() => {
    attemptedRef.current = { key: episodeKey, ids: new Set() }
    confirmedErrorsRef.current = { key: episodeKey, ids: new Set() }
    const first = chooseNext(new Set())
    if (first) startServer(first.id)
    else {
      setStatusMessage("No configured server is available for this language.")
      updatePhase("confirmed_error")
    }
  }, [chooseNext, episodeKey, startServer, updatePhase])

  useEffect(() => {
    if (initializedRef.current && attemptedRef.current.key === episodeKey) return
    initializedRef.current = true
    attemptedRef.current = { key: episodeKey, ids: new Set() }
    confirmedErrorsRef.current = { key: episodeKey, ids: new Set() }
    setStatusMessage("")
    const first = servers.find((server) => server.id === "1" && server.url) ?? chooseNext(new Set())
    if (first) startServer(first.id)
    else {
      setStatusMessage(`No server has a ${type.toUpperCase()} stream for this episode.`)
      updatePhase("confirmed_error")
    }
  }, [chooseNext, episodeKey, servers, startServer, type, updatePhase])

  const activeServer = servers.find((server) => server.id === activeServerId)
  const ready = initializedRef.current && attemptedRef.current.key === episodeKey
  return {
    ready, activeServerId, activeServer, phase, statusMessage, attemptToken,
    selectServer, markReady, markUnverified, markPlaying, failServer, switchServer, retryCurrent, retryAll,
  }
}
