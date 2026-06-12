import { currentPlayer } from "lib/server/auth"
import { tipsForMatch } from "lib/server/db"
import { currentMatches } from "lib/server/matches"

/** Tipps aller Mitspielenden zu einem Spiel — einsehbar erst nach Anstoss (Spec §4.4). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const player = await currentPlayer()
  if (!player) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 })
  }
  const matchId = Number.parseInt((await params).id, 10)
  const match = (await currentMatches()).find((m) => m.id === matchId)
  if (!match) {
    return Response.json({ error: "Unbekanntes Spiel" }, { status: 404 })
  }
  if (new Date(match.kickoff).getTime() > Date.now()) {
    return Response.json({ error: "Tipps sind erst nach Anstoss einsehbar." }, { status: 403 })
  }
  return Response.json({ tips: await tipsForMatch(matchId) })
}
