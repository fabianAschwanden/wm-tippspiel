import { env } from "env.mjs"

/**
 * Google-Login als schlanker OAuth-2.0-Authorization-Code-Flow:
 * /api/auth/google leitet zu Google, /api/auth/google/callback tauscht den
 * Code gegen ein ID-Token und hängt sich an das bestehende Session-System.
 * Konfiguration über GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (env.mjs).
 */

export interface GoogleProfile {
  email: string
  name: string
}

/** CSRF-Schutz: vor dem Redirect gesetzt, im Callback verglichen. */
export const STATE_COOKIE = "wm-tippspiel.oauth-state"

export function googleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

export function googleAuthUrl(origin: string, state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID ?? "")
  url.searchParams.set("redirect_uri", `${origin}/api/auth/google/callback`)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid email profile")
  url.searchParams.set("state", state)
  return url.toString()
}

/**
 * Extrahiert E-Mail und Name aus einem Google-ID-Token. Die Signatur wird
 * nicht geprüft: Das Token kommt direkt von Googles Token-Endpoint über TLS.
 * Geprüft werden Audience, Issuer und dass die E-Mail verifiziert ist.
 */
export function parseGoogleIdToken(idToken: string, clientId: string): GoogleProfile | null {
  const payloadPart = idToken.split(".")[1]
  if (!payloadPart) {
    return null
  }
  let payload: {
    aud?: string
    iss?: string
    email?: string
    email_verified?: boolean
    name?: string
  }
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as typeof payload
  } catch {
    return null
  }
  const issuerOk = payload.iss === "https://accounts.google.com" || payload.iss === "accounts.google.com"
  if (payload.aud !== clientId || !issuerOk || !payload.email || payload.email_verified === false) {
    return null
  }
  const email = payload.email.toLowerCase()
  const name = (payload.name ?? email.split("@")[0] ?? email).trim().slice(0, 30)
  return { email, name }
}

/** Tauscht den Authorization Code gegen das Profil; null bei jedem Fehler. */
export async function exchangeGoogleCode(origin: string, code: string): Promise<GoogleProfile | null> {
  if (!googleConfigured()) {
    return null
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  })
  if (!response.ok) {
    return null
  }
  const body = (await response.json()) as { id_token?: string }
  if (!body.id_token) {
    return null
  }
  return parseGoogleIdToken(body.id_token, env.GOOGLE_CLIENT_ID ?? "")
}
