import { z } from "zod"
import { startSession } from "lib/server/auth"
import { consumeAuthToken, markVerified, setPassword } from "lib/server/db"
import { hashPassword } from "lib/server/password"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben").max(100),
})

/** Neues Passwort über den Reset-Link setzen; der Klick beweist die E-Mail (verifiziert). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 })
  }
  const playerId = await consumeAuthToken(parsed.data.token, "reset")
  if (playerId === null) {
    return Response.json({ error: "Link ist ungültig oder abgelaufen — bitte neu anfordern." }, { status: 400 })
  }
  await setPassword(playerId, hashPassword(parsed.data.password))
  await markVerified(playerId)
  await startSession(playerId)
  return Response.json({ ok: true })
}
