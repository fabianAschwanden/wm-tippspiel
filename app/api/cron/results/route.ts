import { env } from "env.mjs"
import { generateTips } from "lib/bot"
import { footballDataProvider } from "lib/feed/football-data"
import { importFeedMatches } from "lib/feed/import"
import { ensureBot, tipsForPlayer, upsertTip } from "lib/server/db"
import { currentMatches } from "lib/server/matches"

/**
 * Feed-Import (Spec §7): einzige Schreibquelle für Resultate.
 * Vercel Cron ruft GET mit "Authorization: Bearer <CRON_SECRET>" auf.
 */
function authorized(request: Request): boolean {
  if (!env.CRON_SECRET) {
    return true // Demo ohne Secret; Import ist idempotent und liest nur den Feed
  }
  return request.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`
}

async function runBotTips(): Promise<{ tipped: number; skipped: number; errors: number; lastError?: string; apiKeySet: boolean }> {
  const apiKeySet = !!env.ANTHROPIC_API_KEY
  if (!env.ANTHROPIC_API_KEY) return { tipped: 0, skipped: 0, errors: 0, apiKeySet }

  const botId = await ensureBot()
  const existingTips = await tipsForPlayer(botId)
  const matches = await currentMatches()
  const now = Date.now()

  // Alle noch nicht getippten Spiele, die noch nicht angepfiffen sind
  const upcoming = matches.filter((m) => {
    if (existingTips[m.id]) return false
    return new Date(m.kickoff).getTime() > now
  })

  let tipped = 0
  let errors = 0
  let lastError: string | undefined
  try {
    const scores = await generateTips(upcoming, env.ANTHROPIC_API_KEY)
    for (const match of upcoming) {
      const score = scores[match.id]
      if (score) {
        await upsertTip(botId, match.id, score)
        tipped++
      } else {
        errors++
      }
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e)
    errors = upcoming.length
  }
  return { tipped, skipped: matches.length - upcoming.length, errors, lastError, apiKeySet }
}

async function runImport(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return Response.json({ error: "Nicht autorisiert" }, { status: 401 })
  }
  if (!env.FOOTBALL_DATA_TOKEN) {
    return Response.json({ error: "FOOTBALL_DATA_TOKEN ist nicht konfiguriert" }, { status: 503 })
  }
  try {
    const feed = await footballDataProvider.fetchMatches()
    const stats = await importFeedMatches(feed)
    const bot = await runBotTips()
    return Response.json({ ok: true, stats, bot })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Import fehlgeschlagen" }, { status: 502 })
  }
}

export async function GET(request: Request) {
  return runImport(request)
}

export async function POST(request: Request) {
  return runImport(request)
}
