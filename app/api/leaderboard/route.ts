import { MATCHES } from "lib/data"
import { buildLeaderboard } from "lib/leaderboard"
import { currentPlayer } from "lib/server/auth"
import { allPlayersWithTips } from "lib/server/db"

export async function GET() {
  const player = await currentPlayer()
  const players = buildLeaderboard(allPlayersWithTips(), MATCHES, player?.id)
  return Response.json({ players })
}
