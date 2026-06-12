import { buildLeaderboard } from "lib/leaderboard"
import { currentPlayer } from "lib/server/auth"
import { allPlayersWithTips } from "lib/server/db"
import { liveScores } from "lib/server/live"
import { currentMatches } from "lib/server/matches"
import type { Match } from "lib/types"

/** Mit ?live=1: Projektion inkl. laufender Spiele (Zwischenstände als provisorische Resultate). */
export async function GET(request: Request) {
  const player = await currentPlayer()
  let matches = await currentMatches()
  const includeLive = new URL(request.url).searchParams.get("live") === "1"
  if (includeLive) {
    const { scores } = await liveScores()
    const byMatch = new Map(scores.map((s) => [s.matchId, s]))
    matches = matches.map((match): Match => {
      const live = byMatch.get(match.id)
      if (match.result || !live || live.home === null || live.away === null) {
        return match
      }
      return { ...match, result: { home: live.home, away: live.away } }
    })
  }
  const players = buildLeaderboard(await allPlayersWithTips(), matches, player?.id)
  return Response.json({ players, live: includeLive })
}
