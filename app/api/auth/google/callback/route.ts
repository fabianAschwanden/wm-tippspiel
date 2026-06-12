import { cookies } from "next/headers"
import { startSession } from "lib/server/auth"
import { findPlayerByEmail, registerPlayer } from "lib/server/db"
import { exchangeGoogleCode, STATE_COOKIE } from "lib/server/google"

/** Rückkehr von Google: Code gegen Profil tauschen, Spieler:in anlegen/anmelden. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const fail = (reason: string) => Response.redirect(new URL(`/anmelden?fehler=${reason}`, url.origin), 302)

  const store = await cookies()
  const expectedState = store.get(STATE_COOKIE)?.value
  store.delete(STATE_COOKIE)
  const state = url.searchParams.get("state")
  const code = url.searchParams.get("code")
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("google-abgebrochen")
  }

  const profile = await exchangeGoogleCode(url.origin, code).catch(() => null)
  if (!profile) {
    return fail("google-fehlgeschlagen")
  }

  // gleiche E-Mail = gleiches Konto, egal ob per Formular oder Google angemeldet
  const player =
    (await findPlayerByEmail(profile.email)) ??
    (await registerPlayer(profile.name, profile.email)) ??
    (await findPlayerByEmail(profile.email))
  if (!player) {
    return fail("google-fehlgeschlagen")
  }
  await startSession(player.id)
  return Response.redirect(new URL("/", url.origin), 302)
}
