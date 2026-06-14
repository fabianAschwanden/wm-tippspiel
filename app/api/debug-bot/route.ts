import { env } from "env.mjs"

/** Temporärer Debug-Endpoint — nach Diagnose wieder löschen. */
export async function GET() {
  const key = env.ANTHROPIC_API_KEY
  if (!key) {
    return Response.json({ apiKeySet: false, error: "ANTHROPIC_API_KEY fehlt oder leer" })
  }

  // Mini-Test-Call zur Anthropic API (kein web_search, kein Tool — nur Ping)
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Antworte mit OK" }],
      }),
    })
    const body = await res.json()
    return Response.json({
      apiKeySet: true,
      keyPrefix: key.slice(0, 12) + "...",
      anthropicStatus: res.status,
      anthropicOk: res.ok,
      anthropicError: res.ok ? null : body,
    })
  } catch (e) {
    return Response.json({ apiKeySet: true, keyPrefix: key.slice(0, 12) + "...", fetchError: String(e) })
  }
}
