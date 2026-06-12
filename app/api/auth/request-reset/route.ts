import { z } from "zod"
import { createAuthToken, playerAuthByEmail } from "lib/server/db"
import { mailConfigured, sendMail } from "lib/server/mail"

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse"),
})

/**
 * Passwort vergessen bzw. Passwort setzen für Bestands-Konten ohne Passwort.
 * Antwortet immer mit 200, damit keine E-Mail-Adressen ausspioniert werden können.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 })
  }
  const player = await playerAuthByEmail(parsed.data.email)
  if (!player) {
    return Response.json({ ok: true })
  }
  const token = await createAuthToken(player.id, "reset")
  const resetUrl = new URL(`/passwort?token=${token}`, new URL(request.url).origin).toString()
  const sent = await sendMail(
    player.email,
    "WM-Tippspiel: Passwort setzen",
    `Hallo ${player.name}\n\nSetze dein Passwort für das WM-Tippspiel mit diesem Link (24h gültig):\n${resetUrl}\n\nFalls du das nicht angefordert hast, ignoriere diese Mail.`
  )
  // Demo-Fallback ohne Mail-Provider: Link direkt anzeigen
  return Response.json({ ok: true, ...(sent || mailConfigured() ? {} : { resetUrl }) })
}
