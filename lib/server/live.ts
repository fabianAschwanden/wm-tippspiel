import { env } from "env.mjs"
import { allMatchMeta } from "./db"
import { currentMatches } from "./matches"
import { footballDataProvider } from "../feed/football-data"
import { importFeedMatches } from "../feed/import"
import type { FeedProvider } from "../feed/types"
import type { LiveScore, LiveSnapshot } from "../types"

/** Fenster, in dem ein Spiel als «möglicherweise live» gilt (Anstoss bis +3.5 h). */
const LIVE_WINDOW_MS = 3.5 * 60 * 60 * 1000

// Serverseitiger Cache: alle Clients teilen sich einen Upstream-Abruf pro Intervall
// (je Serverless-Instanz). Spec §14.
let cache: { at: number; scores: LiveScore[] } | null = null

function cacheTtlMs(): number {
  return (env.LIVE_CACHE_SECONDS ?? 30) * 1000
}

async function anyMatchInLiveWindow(now: number): Promise<boolean> {
  return (await currentMatches()).some((m) => {
    if (m.result) {
      return false
    }
    const kickoff = new Date(m.kickoff).getTime()
    return kickoff <= now && now - kickoff < LIVE_WINDOW_MS
  })
}

/**
 * Liefert die Live-Zwischenstände; ausserhalb von Spielzeiten ohne Upstream-Request.
 * Meldet der Feed ein Spiel als FINISHED, wird der Endstand sofort übernommen
 * (gleiche Logik wie der Cron-Import). Spec §14.
 */
export async function liveScores(options?: { provider?: FeedProvider; now?: number }): Promise<LiveSnapshot> {
  const now = options?.now ?? Date.now()
  const provider = options?.provider ?? footballDataProvider

  if (cache && now - cache.at < cacheTtlMs()) {
    return { scores: cache.scores, updatedAt: new Date(cache.at).toISOString(), stale: false }
  }
  if (!env.FOOTBALL_DATA_TOKEN && !options?.provider) {
    cache = { at: now, scores: [] }
    return { scores: [], updatedAt: new Date(now).toISOString(), stale: false }
  }
  if (!(await anyMatchInLiveWindow(now))) {
    cache = { at: now, scores: [] }
    return { scores: [], updatedAt: new Date(now).toISOString(), stale: false }
  }

  try {
    const feed = await provider.fetchMatches()
    // übernimmt nebenbei FINISHED-Endstände und gelernte Zuordnungen
    await importFeedMatches(feed)
    const externalToInternal = new Map<string, number>()
    for (const meta of await allMatchMeta()) {
      if (meta.externalId) {
        externalToInternal.set(meta.externalId, meta.matchId)
      }
    }
    const scores: LiveScore[] = []
    for (const feedMatch of feed) {
      if (feedMatch.status !== "IN_PLAY" && feedMatch.status !== "PAUSED") {
        continue
      }
      const matchId = externalToInternal.get(feedMatch.externalId)
      if (matchId === undefined) {
        continue
      }
      scores.push({
        matchId,
        status: feedMatch.status === "IN_PLAY" ? "LIVE" : "PAUSED",
        home: feedMatch.score?.home ?? null,
        away: feedMatch.score?.away ?? null,
        minute: feedMatch.minute,
      })
    }
    cache = { at: now, scores }
    return { scores, updatedAt: new Date(now).toISOString(), stale: false }
  } catch {
    // Feed nicht erreichbar/Rate Limit: letzter Stand mit altem Zeitstempel (Spec §17)
    const fallback = cache ?? { at: now, scores: [] }
    return { scores: fallback.scores, updatedAt: new Date(fallback.at).toISOString(), stale: true }
  }
}

/** Nur für Tests. */
export function resetLiveCache(): void {
  cache = null
}
