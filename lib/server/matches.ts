import { allMatchMeta, allResults } from "./db"
import { MATCHES, TEAMS } from "../data"
import type { Match, Team } from "../types"

function teamByCode(code: string | null): Team | undefined {
  if (!code) {
    return undefined
  }
  return (TEAMS as Record<string, Team>)[code]
}

/**
 * Spielplan aus Sicht der App: statische Spieldaten, überlagert mit den vom
 * Feed gelernten Korrekturen (Anstoss-Verschiebungen, aufgelöste K.o.-Paarungen)
 * und den importierten Endständen. Punkte entstehen ausschliesslich hieraus.
 */
export async function currentMatches(): Promise<Match[]> {
  const results = await allResults()
  const meta = new Map((await allMatchMeta()).map((m) => [m.matchId, m]))
  return MATCHES.map((match) => {
    const m = meta.get(match.id)
    const result = results[match.id]
    return {
      ...match,
      kickoff: m?.kickoff ?? match.kickoff,
      home: teamByCode(m?.homeCode ?? null) ?? match.home,
      away: teamByCode(m?.awayCode ?? null) ?? match.away,
      ...(result ? { result } : {}),
    }
  })
}
