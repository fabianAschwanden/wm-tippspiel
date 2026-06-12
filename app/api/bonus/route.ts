import { z } from "zod"
import { BONUS_QUESTIONS, bonusDeadline } from "lib/bonus"
import { TEAMS } from "lib/data"
import { currentPlayer } from "lib/server/auth"
import { bonusTipsForPlayer, upsertBonusTip } from "lib/server/db"
import { currentMatches } from "lib/server/matches"

const bonusSchema = z.object({
  questionId: z.string().refine((id) => BONUS_QUESTIONS.some((q) => q.id === id), "Unbekannte Zusatzfrage"),
  team: z.string().refine((code) => code in TEAMS, "Unbekanntes Team"),
})

export async function GET() {
  const player = await currentPlayer()
  if (!player) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 })
  }
  return Response.json({ bonus: await bonusTipsForPlayer(player.id) })
}

export async function PUT(request: Request) {
  const player = await currentPlayer()
  if (!player) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 })
  }
  const parsed = bonusSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 })
  }
  // Zusatzfragen sind bis zum Anstoss des ersten K.o.-Spiels änderbar
  const deadline = bonusDeadline(await currentMatches())
  if (new Date(deadline).getTime() <= Date.now()) {
    return Response.json({ error: "Die K.o.-Runde hat begonnen — Zusatzfragen sind geschlossen." }, { status: 422 })
  }
  await upsertBonusTip(player.id, parsed.data.questionId, parsed.data.team)
  return Response.json({ ok: true })
}
