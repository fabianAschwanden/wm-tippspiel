// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest"
import { importFeedMatches } from "./import"
import type { FeedMatch } from "./types"
import { buildLeaderboard } from "../leaderboard"
import { allPlayersWithTips, registerPlayer, upsertTip } from "../server/db"
import { currentMatches } from "../server/matches"

beforeAll(() => {
  process.env.PGLITE_DATA_DIR = "memory://"
})

const feedMatch = (overrides: Partial<FeedMatch>): FeedMatch => ({
  externalId: "1001",
  utcDate: "2026-06-11T19:00:00Z", // Spiel 1: MEX–RSA
  status: "FINISHED",
  stage: "Gruppenphase",
  homeCode: "MEX",
  awayCode: "RSA",
  score: { home: 2, away: 0 },
  minute: null,
  ...overrides,
})

describe("importFeedMatches", () => {
  it("mappt Gruppenspiele über Teams + Tag und übernimmt den Endstand", async () => {
    const stats = await importFeedMatches([feedMatch({})])
    expect(stats).toMatchObject({ mapped: 1, results: 1, unmatched: 0 })
    const match = (await currentMatches()).find((m) => m.id === 1)
    expect(match?.result).toEqual({ home: 2, away: 0 })
  })

  it("ist idempotent — derselbe Stand ändert nichts", async () => {
    const stats = await importFeedMatches([feedMatch({})])
    expect(stats).toEqual({ mapped: 0, results: 0, kickoffUpdates: 0, teamUpdates: 0, unmatched: 0 })
  })

  it("übernimmt Feed-Korrekturen eines Endstands (Spec §7.3)", async () => {
    const stats = await importFeedMatches([feedMatch({ score: { home: 2, away: 1 } })])
    expect(stats.results).toBe(1)
    expect((await currentMatches()).find((m) => m.id === 1)?.result).toEqual({ home: 2, away: 1 })
  })

  it("mappt K.o.-Spiele ohne Teams über Runde + Anstoss und lernt Paarung/Verschiebung", async () => {
    // Spiel 73 (Sechzehntelfinale, 2026-06-28T19:00Z), Teams noch offen
    const pending = feedMatch({
      externalId: "1073",
      utcDate: "2026-06-28T19:00:00Z",
      status: "TIMED",
      stage: "Sechzehntelfinale",
      homeCode: null,
      awayCode: null,
      score: null,
    })
    expect(await importFeedMatches([pending])).toMatchObject({ mapped: 1, results: 0 })

    // später: Paarung bekannt, Anstoss verschoben, Endstand nach Penaltys
    const finished = feedMatch({
      externalId: "1073",
      utcDate: "2026-06-28T21:00:00Z",
      status: "FINISHED",
      stage: "Sechzehntelfinale",
      homeCode: "PAR",
      awayCode: "QAT",
      score: { home: 5, away: 4 },
    })
    const stats = await importFeedMatches([finished])
    expect(stats).toMatchObject({ mapped: 0, results: 1, kickoffUpdates: 1, teamUpdates: 2 })

    const match = (await currentMatches()).find((m) => m.id === 73)
    expect(match?.kickoff).toBe("2026-06-28T21:00:00Z")
    expect(match?.home.code).toBe("PAR")
    expect(match?.away.code).toBe("QAT")
    expect(match?.result).toEqual({ home: 5, away: 4 })
  })

  it("zählt nicht zuordenbare Feed-Spiele als unmatched", async () => {
    const stats = await importFeedMatches([
      feedMatch({ externalId: "4242", utcDate: "2030-01-01T00:00:00Z", homeCode: null, awayCode: null, stage: null }),
    ])
    expect(stats.unmatched).toBe(1)
  })

  it("Punkte und Rangliste entstehen automatisch aus importierten Endständen", async () => {
    const player = (await registerPlayer("Tippkönigin", "koenigin@example.com"))!
    await upsertTip(player.id, 1, { home: 2, away: 1 }) // exakt zum korrigierten Endstand
    const players = buildLeaderboard(await allPlayersWithTips(), await currentMatches(), player.id)
    const me = players.find((p) => p.isCurrentUser)
    expect(me?.points).toBe(3)
    expect(me?.exact).toBe(1)
  })
})
