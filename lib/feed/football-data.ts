import { env } from "env.mjs"
import type { FeedMatch, FeedProvider, FeedStatus } from "./types"
import type { Stage } from "../types"

/** Antwortform von football-data.org v4 (nur die genutzten Felder). */
interface RawScoreSide {
  home: number | null
  away: number | null
}

export interface RawMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  homeTeam: { tla: string | null } | null
  awayTeam: { tla: string | null } | null
  score: {
    fullTime: RawScoreSide
    penalties?: RawScoreSide | null
  } | null
  minute?: number | null
}

const STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: "Gruppenphase",
  LAST_32: "Sechzehntelfinale",
  LAST_16: "Achtelfinale",
  QUARTER_FINALS: "Viertelfinale",
  SEMI_FINALS: "Halbfinale",
  THIRD_PLACE: "Spiel um Platz 3",
  FINAL: "Final",
}

const STATUSES: FeedStatus[] = [
  "SCHEDULED",
  "TIMED",
  "IN_PLAY",
  "PAUSED",
  "FINISHED",
  "POSTPONED",
  "SUSPENDED",
  "CANCELLED",
  "AWARDED",
]

/**
 * Gewertet wird der Gesamtendstand: fullTime (inkl. Verlängerung) plus
 * allfällige Penaltytore (Spec §4.2). Live entspricht fullTime dem Zwischenstand.
 */
function totalScore(raw: RawMatch): FeedMatch["score"] {
  const fullTime = raw.score?.fullTime
  if (fullTime == null || fullTime.home == null || fullTime.away == null) {
    return null
  }
  const penalties = raw.score?.penalties
  return {
    home: fullTime.home + (penalties?.home ?? 0),
    away: fullTime.away + (penalties?.away ?? 0),
  }
}

/** Rohantwort → FeedMatch[]; unbekannte Stages/Status werden übersprungen bzw. neutralisiert. */
export function parseFeedMatches(raw: { matches: RawMatch[] }): FeedMatch[] {
  return raw.matches.map((m) => ({
    externalId: String(m.id),
    utcDate: new Date(m.utcDate).toISOString().replace(".000Z", "Z"),
    status: (STATUSES as string[]).includes(m.status) ? (m.status as FeedStatus) : "SCHEDULED",
    stage: STAGE_MAP[m.stage] ?? null,
    homeCode: m.homeTeam?.tla ?? null,
    awayCode: m.awayTeam?.tla ?? null,
    score: totalScore(m),
    minute: m.minute ?? null,
  }))
}

/** football-data.org v4; Wettbewerb "WC" = FIFA World Cup. */
export const footballDataProvider: FeedProvider = {
  async fetchMatches(): Promise<FeedMatch[]> {
    const token = env.FOOTBALL_DATA_TOKEN
    if (!token) {
      throw new Error("FOOTBALL_DATA_TOKEN ist nicht konfiguriert")
    }
    const response = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`football-data.org antwortete mit ${response.status}`)
    }
    return parseFeedMatches((await response.json()) as { matches: RawMatch[] })
  },
}
