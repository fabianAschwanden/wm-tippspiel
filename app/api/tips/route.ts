import { z } from "zod"
import { currentPlayer } from "lib/server/auth"
import { tipsForPlayer, upsertTip } from "lib/server/db"
import { currentMatches } from "lib/server/matches"

const tipSchema = z.object({
  matchId: z.number().int().min(1),
  home: z.number().int().min(0).max(20),
  away: z.number().int().min(0).max(20),
})

export async function GET() {
  const player = await currentPlayer()
  if (!player) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 })
  }
  return Response.json({ tips: await tipsForPlayer(player.id) })
}

export async function PUT(request: Request) {
  const player = await currentPlayer()
  if (!player) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 })
  }
  const parsed = tipSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 })
  }
  const { matchId, home, away } = parsed.data
  const match = (await currentMatches()).find((m) => m.id === matchId)
  if (!match) {
    return Response.json({ error: "Unbekanntes Spiel" }, { status: 404 })
  }
  // Tipp-Schluss bei Anstoss, serverseitig erzwungen (Spec §4.3, 422 gemäss §11.2)
  if (match.result || new Date(match.kickoff).getTime() <= Date.now()) {
    return Response.json({ error: "Das Spiel hat bereits begonnen — Tipp nicht mehr möglich." }, { status: 422 })
  }
  await upsertTip(player.id, matchId, { home, away })
  return Response.json({ ok: true })
}
