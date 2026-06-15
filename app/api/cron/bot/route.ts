import { env } from "env.mjs"
import { generateTips } from "lib/bot"
import { ensureBot, tipsForPlayer, upsertTip } from "lib/server/db"
import { currentMatches } from "lib/server/matches"

function authorized(request: Request): boolean {
  if (!env.CRON_SECRET) return true
  return request.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`
}

async function runBotTips(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return Response.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const apiKeySet = !!env.ANTHROPIC_API_KEY
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ ok: false, apiKeySet, error: "ANTHROPIC_API_KEY fehlt" }, { status: 503 })
  }

  const botId = await ensureBot()
  const existingTips = await tipsForPlayer(botId)
  const matches = await currentMatches()
  const now = Date.now()

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

  return Response.json({ ok: true, apiKeySet, tipped, skipped: matches.length - upcoming.length, errors, lastError })
}

export async function GET(request: Request) {
  return runBotTips(request)
}

export async function POST(request: Request) {
  return runBotTips(request)
}
