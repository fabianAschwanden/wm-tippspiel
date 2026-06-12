import { env } from "env.mjs"

/**
 * E-Mail-Versand über die Resend-API (kein SDK nötig). Konfiguration über
 * RESEND_API_KEY und MAIL_FROM (z.B. "WM-Tippspiel <onboarding@resend.dev>").
 * Ohne Konfiguration wird nichts verschickt — die Aufrufer zeigen den Link
 * dann direkt im UI an (Demo-Fallback, gleiche Vertrauensstufe wie der
 * frühere passwortlose Login).
 */
export function mailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM)
}

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!mailConfigured()) {
    return false
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text }),
    })
    return response.ok
  } catch {
    return false
  }
}
