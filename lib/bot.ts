/**
 * TippBot: generiert Tipps via Claude API (web_search) für kommende Spiele.
 * Wird vom Cron-Handler aufgerufen — ein API-Call pro Spiel.
 */
import type { Match, Score } from "./types"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

interface TextBlock {
  type: "text"
  text: string
}
interface ToolUseBlock {
  type: "tool_use"
  id: string
  name: string
  input: unknown
}
interface ToolResultBlock {
  type: "tool_result"
  tool_use_id: string
  content: string
}
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

interface AnthropicMessage {
  role: "user" | "assistant"
  content: string | ContentBlock[]
}

interface AnthropicResponse {
  id: string
  stop_reason: "end_turn" | "tool_use" | "max_tokens"
  content: ContentBlock[]
}

const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 3,
}

/** Tippt ein einzelnes Spiel via Claude mit Web-Suche. Gibt null zurück bei Fehler. */
export async function generateTip(match: Match, apiKey: string): Promise<Score | null> {
  const homeFlag = match.home.flag
  const awayFlag = match.away.flag
  const homeName = match.home.name
  const awayName = match.away.name
  const kickoff = new Date(match.kickoff).toLocaleDateString("de-CH", {
    timeZone: "Europe/Zurich",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const systemPrompt = `Du bist ein Fussball-Experte und tippst das Ergebnis eines WM-2026-Spiels.
Nutze die Web-Suche um aktuelle Informationen zu den Teams zu finden (FIFA-Weltrangliste, aktuelle Form, Verletzungen, Aufstellungen).
Antworte am Ende IMMER mit genau diesem JSON-Format und nichts anderem danach:
{"home": <zahl>, "away": <zahl>}
Wähle realistische Ergebnisse (meist 0-3 Tore pro Team).`

  const userPrompt = `Tippe das Ergebnis: ${homeFlag} ${homeName} – ${awayFlag} ${awayName} (${match.stage}, ${kickoff})
Recherchiere kurz und gib dann dein Tipp-Ergebnis als JSON aus.`

  const messages: AnthropicMessage[] = [{ role: "user", content: userPrompt }]

  try {
    let response = await callAnthropic(messages, systemPrompt, apiKey)

    // Tool-Use-Loop (max. 3 Runden)
    for (let round = 0; round < 3 && response.stop_reason === "tool_use"; round++) {
      const toolUses = response.content.filter((b): b is ToolUseBlock => b.type === "tool_use")
      if (toolUses.length === 0) break

      // Anthropic erwartet assistant-Nachricht + tool_result in einer user-Nachricht
      messages.push({ role: "assistant", content: response.content })
      const toolResults: ToolResultBlock[] = toolUses.map((tu) => ({
        type: "tool_result",
        tool_use_id: tu.id,
        content: "Suchergebnis empfangen.",
      }))
      messages.push({ role: "user", content: toolResults })
      response = await callAnthropic(messages, systemPrompt, apiKey)
    }

    return extractScore(response)
  } catch {
    return null
  }
}

async function callAnthropic(
  messages: AnthropicMessage[],
  system: string,
  apiKey: string
): Promise<AnthropicResponse> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system,
      tools: [WEB_SEARCH_TOOL],
      messages,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${text}`)
  }
  return res.json() as Promise<AnthropicResponse>
}

function extractScore(response: AnthropicResponse): Score | null {
  const textBlocks = response.content.filter((b): b is TextBlock => b.type === "text")
  const text = textBlocks.map((b) => b.text).join("\n")

  // Suche nach dem letzten JSON-Objekt mit home/away
  const matches = Array.from(text.matchAll(/\{\s*"home"\s*:\s*(\d+)\s*,\s*"away"\s*:\s*(\d+)\s*\}/g))
  const last = matches.at(-1)
  if (!last) return null

  const home = parseInt(last[1]!, 10)
  const away = parseInt(last[2]!, 10)
  if (isNaN(home) || isNaN(away) || home < 0 || away < 0 || home > 20 || away > 20) return null
  return { home, away }
}
