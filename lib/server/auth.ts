import { cookies } from "next/headers"
import { createSession, deleteSession, playerBySession } from "./db"
import type { PlayerAccount } from "../types"

const SESSION_COOKIE = "wm-tippspiel.session"

/**
 * Demo-Anmeldung ohne Passwort/Magic-Link: Die Session entsteht direkt nach
 * Registrierung bzw. Login per E-Mail. Für den produktiven Einsatz müsste die
 * E-Mail-Adresse verifiziert werden (z.B. Login-Link per Mail).
 */
export async function currentPlayer(): Promise<PlayerAccount | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  return token ? playerBySession(token) : null
}

/** Nur in Route Handlers aufrufen (setzt Cookies). */
export async function startSession(playerId: number): Promise<void> {
  const token = await createSession(playerId)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // bis nach dem Final
  })
}

/** Nur in Route Handlers aufrufen (löscht Cookie + Session). */
export async function endSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await deleteSession(token)
    store.delete(SESSION_COOKIE)
  }
}
