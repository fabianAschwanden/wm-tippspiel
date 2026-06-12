import { describe, expect, it } from "vitest"
import { countExactTips, maxPointsFor, pointsForTip, totalPoints } from "./scoring"
import type { Match } from "./types"

describe("pointsForTip — Gruppenphase", () => {
  const p = (tip: [number, number], result: [number, number]) =>
    pointsForTip({ home: tip[0], away: tip[1] }, { home: result[0], away: result[1] }, "Gruppenphase")

  it("gibt 10 Punkte für das exakte Ergebnis (5+1+1+3)", () => {
    expect(p([2, 1], [2, 1])).toBe(10)
    expect(p([0, 0], [0, 0])).toBe(10)
  })

  it("gibt 8 Punkte für Tendenz + Tordifferenz ohne richtige Torzahlen", () => {
    expect(p([2, 1], [3, 2])).toBe(8) // Sieger + Differenz, keine Torzahl
    expect(p([1, 1], [2, 2])).toBe(8) // Unentschieden + Differenz 0
  })

  it("gibt 6 Punkte für Tendenz + eine richtige Torzahl", () => {
    expect(p([2, 1], [2, 0])).toBe(6) // Sieger + Heim-Tore
    expect(p([2, 1], [3, 1])).toBe(6) // Sieger + Gast-Tore
  })

  it("gibt 5 Punkte für die blosse Tendenz", () => {
    expect(p([2, 0], [4, 1])).toBe(5)
  })

  it("gibt 1 Punkt für eine richtige Torzahl bei falscher Tendenz", () => {
    expect(p([2, 1], [2, 3])).toBe(1) // nur Heim-Tore stimmen
    expect(p([0, 1], [1, 1])).toBe(1) // nur Gast-Tore stimmen
  })

  it("gibt keine Differenz-Punkte bei richtiger absoluter, aber falsch gerichteter Differenz", () => {
    expect(p([2, 1], [1, 2])).toBe(0) // |+1| = |−1|, aber falscher Sieger
  })

  it("gibt 0 Punkte für komplett daneben", () => {
    expect(p([3, 0], [1, 2])).toBe(0)
  })
})

describe("pointsForTip — K.o.-Phase zählt doppelt", () => {
  it.each([
    ["Sechzehntelfinale"],
    ["Achtelfinale"],
    ["Viertelfinale"],
    ["Halbfinale"],
    ["Spiel um Platz 3"],
    ["Final"],
  ] as const)("%s: exakt 20, Tendenz+Differenz 16, Tendenz 10", (stage) => {
    expect(pointsForTip({ home: 2, away: 1 }, { home: 2, away: 1 }, stage)).toBe(20)
    expect(pointsForTip({ home: 2, away: 1 }, { home: 3, away: 2 }, stage)).toBe(16)
    expect(pointsForTip({ home: 2, away: 0 }, { home: 4, away: 1 }, stage)).toBe(10)
  })

  it("maxPointsFor liefert 10 bzw. 20", () => {
    expect(maxPointsFor("Gruppenphase")).toBe(10)
    expect(maxPointsFor("Final")).toBe(20)
  })
})

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
    stage: "Final",
    kickoff: "2026-07-19T19:00:00Z",
    home: team("CCC"),
    away: team("DDD"),
    result: { home: 0, away: 0 },
  },
  { id: 3, stage: "Gruppenphase", kickoff: "2026-06-13T18:00:00Z", home: team("EEE"), away: team("FFF") },
]

describe("totalPoints", () => {
  it("summiert nur beendete Spiele mit Tipp, K.o. doppelt", () => {
    const tips = {
      1: { home: 2, away: 1 }, // exakt -> 10
      2: { home: 0, away: 0 }, // exakt im Final -> 20
      3: { home: 5, away: 0 }, // Spiel offen -> 0
    }
    expect(totalPoints(tips, matches)).toBe(30)
  })

  it("ist 0 ohne Tipps", () => {
    expect(totalPoints({}, matches)).toBe(0)
  })
})

describe("countExactTips", () => {
  it("zählt nur exakte Tipps auf beendete Spiele", () => {
    expect(countExactTips({ 1: { home: 2, away: 1 }, 2: { home: 1, away: 0 } }, matches)).toBe(1)
    expect(countExactTips({}, matches)).toBe(0)
  })
})
