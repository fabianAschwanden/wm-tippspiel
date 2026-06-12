"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchLive, fetchMatches } from "./api"
import { MATCHES } from "./data"
import type { LiveSnapshot, Match } from "./types"

/**
 * Statischer Spielplan als Startwert, ersetzt durch den Server-Stand
 * (Resultate, Verschiebungen); refresh() lädt neu (z.B. nach dem Sync-Button).
 */
export function useMatches(): { matches: Match[]; refresh: () => Promise<void> } {
  const [matches, setMatches] = useState<Match[]>(MATCHES)
  const refresh = useCallback(async () => {
    const fresh = await fetchMatches()
    if (fresh) {
      setMatches(fresh)
    }
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])
  return { matches, refresh }
}

const LIVE_POLL_MS = 60_000

/**
 * Pollt /api/live, solange der Tab sichtbar ist (Page Visibility API, Spec §16).
 * Der Server cached und fragt ausserhalb von Spielzeiten keinen Upstream an.
 */
export function useLive(): LiveSnapshot | null {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const poll = () => {
      void fetchLive().then((fresh) => {
        if (fresh) {
          setSnapshot(fresh)
        }
      })
    }
    const start = () => {
      if (!timer) {
        poll()
        timer = setInterval(poll, LIVE_POLL_MS)
      }
    }
    const stop = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop())
    document.addEventListener("visibilitychange", onVisibility)
    onVisibility()
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      stop()
    }
  }, [])
  return snapshot
}
