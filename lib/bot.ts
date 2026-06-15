/**
 * TippBot: generiert Tipps für alle offenen Spiele in einem einzigen Claude-Call.
 * Kein web_search (zu langsam für Vercel 10s-Timeout) — Claude nutzt sein Trainingswissen
 * über FIFA-Rankings, Teamstärken und WM-2026-Gruppenkonstellationen.
 */
import type { Match, Score } from "./types"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

interface TextBlock {
  type: "text"
  text: string
}
type ContentBlock = TextBlock | { type: string }

interface AnthropicResponse {
  content: ContentBlock[]
}

/** Generiert Tipps für alle übergebenen Spiele in einem API-Call. */
export async function generateTips(matches: Match[], apiKey: string): Promise<Record<number, Score>> {
  if (matches.length === 0) return {}

  const list = matches
    .map((m) => `${m.id}: ${m.home.flag} ${m.home.name} – ${m.away.flag} ${m.away.name} (${m.stage})`)
    .join("\n")

  const prompt = `Du bist ein Fussball-Experte und tippst WM-2026-Spiele basierend auf FIFA-Weltrangliste und Teamstärken.

Tippe folgende Spiele. Antworte NUR mit einem JSON-Array, keine Erklärungen:
[{"id": <match_id>, "home": <tore>, "away": <tore>}, ...]

Regeln:
- Realistische Ergebnisse (meist 0–3 Tore pro Team)
- Favorit laut FIFA-Ranking gewinnt öfter
- Kein Kommentar, nur das JSON-Array

Spiele:
${list}`

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${text}`)
  }

  const data = (await res.json()) as AnthropicResponse
  const text = data.content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")

  return parseScores(text, matches)
}

function parseScores(text: string, matches: Match[]): Record<number, Score> {
  const validIds = new Set(matches.map((m) => m.id))
  const results: Record<number, Score> = {}

  // Suche nach JSON-Array
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (!arrayMatch) return results

  try {
    const parsed = JSON.parse(arrayMatch[0]) as unknown[]
    for (const item of parsed) {
      if (typeof item === "object" && item !== null && "id" in item && "home" in item && "away" in item) {
        const id = Number((item as Record<string, unknown>).id)
        const home = Number((item as Record<string, unknown>).home)
        const away = Number((item as Record<string, unknown>).away)
        if (validIds.has(id) && !isNaN(home) && !isNaN(away) && home >= 0 && away >= 0 && home <= 20 && away <= 20) {
          results[id] = { home, away }
        }
      }
    }
  } catch {
    // JSON-Parse fehlgeschlagen — leeres Ergebnis
  }

  return results
}
