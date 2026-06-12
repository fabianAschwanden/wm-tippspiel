import { z } from "zod"
import { createAuthToken, playerAuthByEmail, registerPlayer, updateUnverifiedPlayer } from "lib/server/db"
import { mailConfigured, sendMail } from "lib/server/mail"
import { hashPassword } from "lib/server/password"

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(30),
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben").max(100),
})

/**
 * Registrierung mit E-Mail-Verifikation: Konto wird angelegt, die Session
 * entsteht erst nach Bestätigung des per Mail verschickten Links.
 * Solange unbestätigt, darf eine erneute Registrierung Name/Passwort ersetzen
 * (die E-Mail ist noch nicht als Eigentum bewiesen) und verschickt den Link neu.
 */
export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 })
  }
  const { name, email, password } = parsed.data

  const existing = await playerAuthByEmail(email)
  if (existing?.verified) {
    return Response.json({ error: "Diese E-Mail ist bereits registriert — bitte anmelden." }, { status: 409 })
  }

  const passwordHash = hashPassword(password)
  let playerId: number
  if (existing) {
    await updateUnverifiedPlayer(existing.id, name, passwordHash)
    playerId = existing.id
  } else {
    const player = await registerPlayer(name, email, passwordHash)
    if (!player) {
      return Response.json({ error: "Diese E-Mail ist bereits registriert — bitte anmelden." }, { status: 409 })
    }
    playerId = player.id
  }

  const token = await createAuthToken(playerId, "verify")
  const verifyUrl = new URL(`/api/auth/verify?token=${token}`, new URL(request.url).origin).toString()
  const sent = await sendMail(
    email,
    "WM-Tippspiel: E-Mail bestätigen",
    `Hallo ${name}\n\nBestätige deine E-Mail für das WM-Tippspiel mit diesem Link (24h gültig):\n${verifyUrl}\n\nFalls du dich nicht registriert hast, ignoriere diese Mail.`
  )
  // Demo-Fallback ohne Mail-Provider: Link direkt anzeigen
  return Response.json({ pending: true, ...(sent || mailConfigured() ? {} : { verifyUrl }) }, { status: 201 })
}
