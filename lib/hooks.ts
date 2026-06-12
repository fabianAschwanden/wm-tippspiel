"use client"

import { useEffect, useState } from "react"
import { fetchLive, fetchMatches } from "./api"
import { MATCHES } from "./data"
import type { LiveSnapshot, Match } from "./types"

/** Statischer Spielplan als Startwert, ersetzt durch den Server-Stand (Resultate, Verschiebungen). */
export function useMatches(): Match[] {
  const [matches, setMatches] = useState<Match[]>(MATCHES)
  useEffect(() => {
    void fetchMatches().then((fresh) => {
      if (fresh) {
        setMatches(fresh)
      }
    })
  }, [])
  return matches
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
