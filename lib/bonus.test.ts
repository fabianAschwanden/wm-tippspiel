import { describe, expect, it } from "vitest"
import { bonusAnswers, bonusDeadline, bonusPoints } from "./bonus"
import { MATCHES } from "./data"
import type { Match } from "./types"

const team = (code: string) => ({ code, name: code, flag: "🏳️" })

const finished = (id: number, home: string, away: string, h: number, a: number): Match => ({
  id,
  stage: id === 104 ? "Final" : "Spiel um Platz 3",
  kickoff: "2026-07-19T19:00:00Z",
  home: team(home),
  away: team(away),
  result: { home: h, away: a },
})

describe("bonusAnswers", () => {
  it("ist leer, solange Final und Bronze-Spiel offen sind", () => {
    expect(bonusAnswers(MATCHES)).toEqual({})
  })

  it("leitet Weltmeister, Vize und Dritten aus den Resultaten ab", () => {
    const answers = bonusAnswers([finished(104, "SUI", "BRA", 2, 1), finished(103, "GER", "FRA", 0, 3)])
    expect(answers).toEqual({ weltmeister: "SUI", vize: "BRA", dritter: "FRA" })
  })
})

describe("bonusPoints", () => {
  const answers = { weltmeister: "SUI", vize: "BRA", dritter: "FRA" }

  it("gibt 50 für den Weltmeister und 20 je weitere richtige Antwort", () => {
    expect(bonusPoints({ weltmeister: "SUI" }, answers)).toBe(50)
    expect(bonusPoints({ weltmeister: "SUI", vize: "BRA", dritter: "FRA" }, answers)).toBe(90)
    expect(bonusPoints({ weltmeister: "GER", vize: "BRA" }, answers)).toBe(20)
    expect(bonusPoints({}, answers)).toBe(0)
  })

  it("gibt nichts, solange keine Antworten feststehen", () => {
    expect(bonusPoints({ weltmeister: "SUI" }, {})).toBe(0)
  })
})

describe("bonusDeadline", () => {
  it("ist der Anstoss des ersten K.o.-Spiels", () => {
    expect(bonusDeadline(MATCHES)).toBe("2026-06-28T19:00:00Z")
  })
})
