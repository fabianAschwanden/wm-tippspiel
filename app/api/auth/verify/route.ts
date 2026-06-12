import { startSession } from "lib/server/auth"
import { consumeAuthToken, markVerified } from "lib/server/db"

/** Link aus der Bestätigungs-Mail: Token einlösen, verifizieren, anmelden. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")
  const playerId = token ? await consumeAuthToken(token, "verify") : null
  if (playerId === null) {
    return Response.redirect(new URL("/anmelden?fehler=verifizierung-ungueltig", url.origin), 302)
  }
  await markVerified(playerId)
  await startSession(playerId)
  return Response.redirect(new URL("/", url.origin), 302)
}
