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
        { id: 1, name: "Anna", tips: { 1: { home: 1, away: 0 } } }, // Tendenz + Differenz -> 2 Punkte
        { id: 2, name: "Marco", tips: { 1: { home: 2, away: 1 } } }, // exakt -> 3 Punkte
        { id: 3, name: "Lena", tips: {} },
      ],
      matches,
      1
    )
    expect(players.map((p) => p.name)).toEqual(["Marco", "Anna", "Lena"])
    expect(players.map((p) => p.points)).toEqual([3, 2, 0])
    expect(players.find((p) => p.isCurrentUser)?.name).toBe("Anna")
  })

  it("bricht Gleichstand alphabetisch", () => {
    const players = buildLeaderboard(
      [
        { id: 1, name: "Zoe", tips: {} },
        { id: 2, name: "Ben", tips: {} },
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
        { id: 7, name: "Anna", tips: { 1: { home: 2, away: 1 } } },
        { id: 8, name: "Ben", tips: {} },
      ],
      matches
    )
    expect(rankOf(players, 7)).toBe(1)
    expect(rankOf(players, 8)).toBe(2)
    expect(rankOf(players, 99)).toBe(0)
  })
})
