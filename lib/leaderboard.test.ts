import { describe, expect, it } from "vitest"
import { buildLeaderboard, rankOf } from "./leaderboard"
import type { Match } from "./types"

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
  { id: 2, stage: "Gruppenphase", kickoff: "2026-06-12T18:00:00Z", home: team("CCC"), away: team("DDD") },
]

describe("buildLeaderboard", () => {
  it("sortiert nach Punkten und markiert die aktuelle Spielerin", () => {
    const players = buildLeaderboard(
      [
        { id: 1, name: "Anna", tips: { 1: { home: 1, away: 0 } }, bonus: {} }, // Tendenz + Differenz -> 8
        { id: 2, name: "Marco", tips: { 1: { home: 2, away: 1 } }, bonus: {} }, // exakt -> 10
        { id: 3, name: "Lena", tips: {}, bonus: {} },
      ],
      matches,
      1
    )
    expect(players.map((p) => p.name)).toEqual(["Marco", "Anna", "Lena"])
    expect(players.map((p) => p.points)).toEqual([10, 8, 0])
    expect(players.find((p) => p.isCurrentUser)?.name).toBe("Anna")
  })

  it("zählt Zusatzfragen-Punkte, sobald die Antworten feststehen", () => {
    const finalMatch: Match = {
      id: 104,
      stage: "Final",
      kickoff: "2026-07-19T19:00:00Z",
      home: team("SUI"),
      away: team("BRA"),
      result: { home: 2, away: 1 },
    }
    const players = buildLeaderboard(
      [
        { id: 1, name: "Anna", tips: {}, bonus: { weltmeister: "SUI", vize: "BRA" } }, // 50 + 20
        { id: 2, name: "Marco", tips: {}, bonus: { weltmeister: "BRA" } }, // 0
      ],
      [finalMatch]
    )
    expect(players.map((p) => p.name)).toEqual(["Anna", "Marco"])
    expect(players.map((p) => p.points)).toEqual([70, 0])
  })

  it("bricht Punktgleichstand mit der Anzahl exakter Tipps, danach alphabetisch", () => {
    const twoMatches: Match[] = [
      ...matches,
      {
        id: 3,
        stage: "Gruppenphase",
        kickoff: "2026-06-13T18:00:00Z",
        home: team("GGG"),
        away: team("HHH"),
        result: { home: 1, away: 0 },
      },
    ]
    const players = buildLeaderboard(
      [
        { id: 1, name: "Zoe", tips: { 1: { home: 2, away: 1 } }, bonus: {} }, // exakt -> 10 P, 1 exakt
        // zweimal blosse Tendenz -> 5 + 5 = 10 P, 0 exakt
        { id: 2, name: "Ben", tips: { 1: { home: 4, away: 0 }, 3: { home: 3, away: 1 } }, bonus: {} },
      ],
      twoMatches
    )
    expect(players.map((p) => p.points)).toEqual([10, 10])
    expect(players.map((p) => p.name)).toEqual(["Zoe", "Ben"])
  })

  it("bricht völligen Gleichstand alphabetisch", () => {
    const players = buildLeaderboard(
      [
        { id: 1, name: "Zoe", tips: {}, bonus: {} },
        { id: 2, name: "Ben", tips: {}, bonus: {} },
      ],
      matches
    )
    expect(players.map((p) => p.name)).toEqual(["Ben", "Zoe"])
  })
})

describe("rankOf", () => {
  it("liefert den 1-basierten Rang per Spieler-ID", () => {
    const players = buildLeaderboard(
      [
        { id: 7, name: "Anna", tips: { 1: { home: 2, away: 1 } }, bonus: {} },
        { id: 8, name: "Ben", tips: {}, bonus: {} },
      ],
      matches
    )
    expect(rankOf(players, 7)).toBe(1)
    expect(rankOf(players, 8)).toBe(2)
    expect(rankOf(players, 99)).toBe(0)
  })
})
