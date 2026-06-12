// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { liveScores, resetLiveCache } from "./live"
import type { FeedMatch, FeedProvider } from "../feed/types"

beforeAll(() => {
  process.env.PGLITE_DATA_DIR = "memory://"
})

beforeEach(() => {
  resetLiveCache()
})

// Spiel 1 (MEX–RSA) läuft: Anstoss 2026-06-11T19:00Z, now 30 Minuten später
const DURING_MATCH = new Date("2026-06-11T19:30:00Z").getTime()
const NO_MATCH = new Date("2026-01-01T12:00:00Z").getTime()

const liveFeed: FeedMatch[] = [
  {
    externalId: "1001",
    utcDate: "2026-06-11T19:00:00Z",
    status: "IN_PLAY",
    stage: "Gruppenphase",
    homeCode: "MEX",
    awayCode: "RSA",
    score: { home: 1, away: 0 },
    minute: 31,
  },
]

function providerWith(feed: FeedMatch[]): { provider: FeedProvider; calls: () => number } {
  const fetchMatches = vi.fn().mockResolvedValue(feed)
  return { provider: { fetchMatches }, calls: () => fetchMatches.mock.calls.length }
}

describe("liveScores", () => {
  it("liefert Zwischenstände laufender Spiele", async () => {
    const { provider } = providerWith(liveFeed)
    const snapshot = await liveScores({ provider, now: DURING_MATCH })
    expect(snapshot.stale).toBe(false)
    expect(snapshot.scores).toEqual([{ matchId: 1, status: "LIVE", home: 1, away: 0, minute: 31 }])
  })

  it("nutzt den Cache — ein Upstream-Abruf pro Intervall", async () => {
    const { provider, calls } = providerWith(liveFeed)
    await liveScores({ provider, now: DURING_MATCH })
    await liveScores({ provider, now: DURING_MATCH + 5_000 })
    expect(calls()).toBe(1)
  })

  it("fragt ausserhalb von Spielzeiten keinen Upstream an", async () => {
    const { provider, calls } = providerWith(liveFeed)
    const snapshot = await liveScores({ provider, now: NO_MATCH })
    expect(calls()).toBe(0)
    expect(snapshot.scores).toEqual([])
  })

  it("zeigt bei Feed-Ausfall den letzten Stand als stale", async () => {
    const { provider } = providerWith(liveFeed)
    await liveScores({ provider, now: DURING_MATCH })
    const failing: FeedProvider = { fetchMatches: vi.fn().mockRejectedValue(new Error("rate limit")) }
    const snapshot = await liveScores({ provider: failing, now: DURING_MATCH + 60_000 })
    expect(snapshot.stale).toBe(true)
    expect(snapshot.scores).toEqual([{ matchId: 1, status: "LIVE", home: 1, away: 0, minute: 31 }])
  })

  it("übernimmt FINISHED aus dem Live-Feed sofort als Endstand", async () => {
    const finishedFeed: FeedMatch[] = [
      { ...liveFeed[0]!, status: "FINISHED", score: { home: 2, away: 0 }, minute: null },
    ]
    const { provider } = providerWith(finishedFeed)
    const snapshot = await liveScores({ provider, now: DURING_MATCH })
    expect(snapshot.scores).toEqual([])
    const { currentMatches } = await import("./matches")
    expect((await currentMatches()).find((m) => m.id === 1)?.result).toEqual({ home: 2, away: 0 })
  })
})
