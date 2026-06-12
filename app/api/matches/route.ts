import { currentMatches } from "lib/server/matches"

/** Spielplan inkl. importierter Resultate und Feed-Korrekturen. */
export async function GET() {
  return Response.json({ matches: await currentMatches() })
}
