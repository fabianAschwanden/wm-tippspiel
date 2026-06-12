import { liveScores } from "lib/server/live"

/** Live-Zwischenstände (Spec Stufe B): serverseitig gecacht, ausserhalb von Spielzeiten ohne Upstream. */
export async function GET() {
  const snapshot = await liveScores()
  return Response.json(snapshot)
}
