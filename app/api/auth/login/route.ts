import { z } from "zod"
import { startSession } from "lib/server/auth"
import { findPlayerByEmail } from "lib/server/db"

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse"),
})

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 })
  }
  const player = findPlayerByEmail(parsed.data.email)
  if (!player) {
    return Response.json({ error: "E-Mail nicht gefunden — bitte zuerst registrieren." }, { status: 404 })
  }
  await startSession(player.id)
  return Response.json({ player })
}
