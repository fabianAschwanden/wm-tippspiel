import { z } from "zod"
import { startSession } from "lib/server/auth"
import { playerAuthByEmail } from "lib/server/db"
import { verifyPassword } from "lib/server/password"

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort fehlt"),
})

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 })
  }
  const player = await playerAuthByEmail(parsed.data.email)
  if (!player) {
    return Response.json({ error: "E-Mail nicht gefunden — bitte zuerst registrieren." }, { status: 404 })
  }
  if (!player.passwordHash) {
    return Response.json(
      { error: "Für dieses Konto ist kein Passwort gesetzt — nutze «Passwort vergessen» oder den Google-Login." },
      { status: 403 }
    )
  }
  if (!verifyPassword(parsed.data.password, player.passwordHash)) {
    return Response.json({ error: "Falsches Passwort." }, { status: 401 })
  }
  if (!player.verified) {
    return Response.json(
      { error: "E-Mail noch nicht bestätigt — bitte den Link aus der Bestätigungs-Mail öffnen oder neu registrieren." },
      { status: 403 }
    )
  }
  await startSession(player.id)
  return Response.json({ player: { id: player.id, email: player.email, name: player.name } })
}
