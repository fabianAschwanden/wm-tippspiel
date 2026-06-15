import { env } from "env.mjs"
import { footballDataProvider } from "lib/feed/football-data"
import { importFeedMatches } from "lib/feed/import"

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
    return Response.json({ ok: true, stats })
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
