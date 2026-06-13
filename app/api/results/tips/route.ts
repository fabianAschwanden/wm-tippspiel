import { allPlayersWithTips } from "lib/server/db"
import { currentMatches } from "lib/server/matches"

export interface PlayerTipRow {
  playerId: number
  playerName: string
  isBot: boolean
  tip: { home: number; away: number } | null
}

export interface MatchWithTips {
  matchId: number
  stage: string
  homeTeam: string
  homeFlag: string
  awayTeam: string
  awayFlag: string
  kickoff: string
  result: { home: number; away: number }
  tips: PlayerTipRow[]
}

/** Alle Tipps zu beendeten Spielen — nach Anstoss grundsätzlich öffentlich. */
export async function GET() {
  const [matches, players] = await Promise.all([currentMatches(), allPlayersWithTips()])

  const finished = matches.filter((m) => m.result !== undefined)

  const data: MatchWithTips[] = finished.map((match) => ({
    matchId: match.id,
    stage: match.stage,
    homeTeam: match.home.name,
    homeFlag: match.home.flag,
    awayTeam: match.away.name,
    awayFlag: match.away.flag,
    kickoff: match.kickoff,
    result: match.result!,
    tips: players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      isBot: p.isBot ?? false,
      tip: p.tips[match.id] ?? null,
    })),
  }))

  return Response.json({ matches: data })
}
