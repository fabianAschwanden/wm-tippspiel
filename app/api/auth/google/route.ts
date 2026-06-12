import { cookies } from "next/headers"
import { randomBytes } from "node:crypto"
import { googleAuthUrl, googleConfigured, STATE_COOKIE } from "lib/server/google"

/** Startet den Google-Login: State-Cookie setzen und zu Google weiterleiten. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  if (!googleConfigured()) {
    return Response.redirect(new URL("/anmelden?fehler=google-nicht-konfiguriert", origin), 302)
  }
  const state = randomBytes(16).toString("hex")
  const store = await cookies()
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  })
  return Response.redirect(googleAuthUrl(origin, state), 302)
}
