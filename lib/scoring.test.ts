import { describe, expect, it } from "vitest"
import { pointsForTip, totalPoints } from "./scoring"
import type { Match } from "./types"

describe("pointsForTip", () => {
  it("gibt 3 Punkte für das exakte Ergebnis", () => {
    expect(pointsForTip({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(3)
    expect(pointsForTip({ home: 0, away: 0 }, { home: 0, away: 0 })).toBe(3)
  })

  it("gibt 2 Punkte für richtige Tendenz und Tordifferenz", () => {
    expect(pointsForTip({ home: 2, away: 1 }, { home: 3, away: 2 })).toBe(2)
    expect(pointsForTip({ home: 1, away: 1 }, { home: 2, away: 2 })).toBe(2)
    expect(pointsForTip({ home: 0, away: 2 }, { home: 1, away: 3 })).toBe(2)
  })

  it("gibt 1 Punkt für nur richtige Tendenz", () => {
    expect(pointsForTip({ home: 2, away: 1 }, { home: 3, away: 1 })).toBe(1)
    expect(pointsForTip({ home: 0, away: 1 }, { home: 1, away: 4 })).toBe(1)
  })

  it("gibt 0 Punkte für falsche Tendenz", () => {
    expect(pointsForTip({ home: 2, away: 1 }, { home: 1, away: 1 })).toBe(0)
    expect(pointsForTip({ home: 1, away: 0 }, { home: 0, away: 2 })).toBe(0)
  })
})

describe("totalPoints", () => {
  const team = (code: string) => ({ code, name: code, flag: "🏳️" })
  const matches: Match[] = [
    {
      id: 1,
      stage: "Gruppenphase",
      kickoff: "2026-06-11T18:00:00Z",
      home: team("AAA"),
      away: team("BBB"),
      result: { home: 2, away: 1 },
    },
    {
      id: 2,
      stage: "Gruppenphase",
      kickoff: "2026-06-12T18:00:00Z",
      home: team("CCC"),
      away: team("DDD"),
      result: { home: 0, away: 0 },
    },
    { id: 3, stage: "Gruppenphase", kickoff: "2026-06-13T18:00:00Z", home: team("EEE"), away: team("FFF") },
  ]

  it("summiert nur beendete Spiele mit Tipp", () => {
    const tips = {
      1: { home: 2, away: 1 }, // exakt -> 3
      2: { home: 1, away: 1 }, // Tendenz + Differenz -> 2
      3: { home: 5, away: 0 }, // Spiel offen -> 0
    }
    expect(totalPoints(tips, matches)).toBe(5)
  })

  it("ist 0 ohne Tipps", () => {
    expect(totalPoints({}, matches)).toBe(0)
  })
})
