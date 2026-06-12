import { env } from "env.mjs"
import { footballDataProvider } from "lib/feed/football-data"
import { importFeedMatches } from "lib/feed/import"
import { currentPlayer } from "lib/server/auth"

/**
 * Ad-hoc-Abgleich mit dem Resultat-Feed (Sync-Button). Gleiche Import-Logik
 * wie der Cron — Resultate kommen weiterhin ausschliesslich aus dem Feed.
 * Drosselung pro Instanz, damit das Rate Limit des Feeds geschont wird.
 */
const MIN_INTERVAL_MS = 60_000
let lastSyncAt = 0

export async function POST() {
  const player = await currentPlayer()
  if (!player) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 })
  }
  if (!env.FOOTBALL_DATA_TOKEN) {
    return Response.json({ error: "Resultat-Feed ist nicht konfiguriert (FOOTBALL_DATA_TOKEN)." }, { status: 503 })
  }
  const now = Date.now()
  if (now - lastSyncAt < MIN_INTERVAL_MS) {
    return Response.json({ ok: true, throttled: true })
  }
  lastSyncAt = now
  try {
    const feed = await footballDataProvider.fetchMatches()
    const stats = await importFeedMatches(feed)
    return Response.json({ ok: true, stats })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Abgleich fehlgeschlagen" }, { status: 502 })
  }
}
