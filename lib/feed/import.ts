import type { FeedMatch } from "./types"
import { TEAMS } from "../data"
import { allMatchMeta, allResults, upsertMatchMeta, upsertResult } from "../server/db"
import { currentMatches } from "../server/matches"
import type { Match } from "../types"

export interface ImportStats {
  mapped: number
  results: number
  kickoffUpdates: number
  teamUpdates: number
  unmatched: number
}

const isKnownTeam = (code: string | null): code is keyof typeof TEAMS => code != null && code in TEAMS

const utcDay = (iso: string) => new Date(iso).toISOString().slice(0, 10)
const sameInstant = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime()

/**
 * Findet das interne Spiel zu einem Feed-Spiel (erstmaliges Mapping):
 * Gruppenspiele über das Team-Paar am selben UTC-Tag, K.o.-Spiele über
 * Runde + exakte Anstosszeit (innerhalb einer Runde eindeutig).
 */
function findInternalMatch(feed: FeedMatch, matches: Match[], taken: Set<number>): Match | undefined {
  const candidates = matches.filter((m) => !taken.has(m.id) && (feed.stage === null || m.stage === feed.stage))
  if (isKnownTeam(feed.homeCode) && isKnownTeam(feed.awayCode)) {
    const pair = new Set([feed.homeCode, feed.awayCode])
    const byTeams = candidates.filter(
      (m) => pair.has(m.home.code) && pair.has(m.away.code) && utcDay(m.kickoff) === utcDay(feed.utcDate)
    )
    if (byTeams.length === 1) {
      return byTeams[0]
    }
  }
  const byKickoff = candidates.filter((m) => sameInstant(m.kickoff, feed.utcDate))
  return byKickoff.length === 1 ? byKickoff[0] : undefined
}

/**
 * Übernimmt einen Feed-Stand in die Datenbank (Spec §7):
 * Endstände bei FINISHED, Anstoss-Verschiebungen, aufgelöste K.o.-Paarungen.
 * Idempotent — derselbe Stand zweimal importiert ändert nichts.
 */
export async function importFeedMatches(feed: FeedMatch[]): Promise<ImportStats> {
  const stats: ImportStats = { mapped: 0, results: 0, kickoffUpdates: 0, teamUpdates: 0, unmatched: 0 }
  const matches = await currentMatches()
  const existingResults = await allResults()
  const externalToInternal = new Map<string, number>()
  for (const meta of await allMatchMeta()) {
    if (meta.externalId) {
      externalToInternal.set(meta.externalId, meta.matchId)
    }
  }
  const taken = new Set(externalToInternal.values())

  for (const feedMatch of feed) {
    let matchId = externalToInternal.get(feedMatch.externalId)
    if (matchId === undefined) {
      const found = findInternalMatch(feedMatch, matches, taken)
      if (!found) {
        stats.unmatched++
        continue
      }
      matchId = found.id
      taken.add(matchId)
      externalToInternal.set(feedMatch.externalId, matchId)
      await upsertMatchMeta({ matchId, externalId: feedMatch.externalId })
      stats.mapped++
    }
    const internal = matches.find((m) => m.id === matchId)
    if (!internal) {
      continue
    }

    if (!sameInstant(internal.kickoff, feedMatch.utcDate)) {
      await upsertMatchMeta({ matchId, kickoff: feedMatch.utcDate })
      stats.kickoffUpdates++
    }
    if (isKnownTeam(feedMatch.homeCode) && internal.home.code !== feedMatch.homeCode) {
      await upsertMatchMeta({ matchId, homeCode: feedMatch.homeCode })
      stats.teamUpdates++
    }
    if (isKnownTeam(feedMatch.awayCode) && internal.away.code !== feedMatch.awayCode) {
      await upsertMatchMeta({ matchId, awayCode: feedMatch.awayCode })
      stats.teamUpdates++
    }

    if (feedMatch.status === "FINISHED" && feedMatch.score) {
      const existing = existingResults[matchId]
      if (!existing || existing.home !== feedMatch.score.home || existing.away !== feedMatch.score.away) {
        await upsertResult(matchId, feedMatch.score)
        stats.results++
      }
    }
  }
  return stats
}
