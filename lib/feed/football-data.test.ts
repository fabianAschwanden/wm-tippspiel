import { describe, expect, it } from "vitest"
import { parseFeedMatches, type RawMatch } from "./football-data"

const raw = (overrides: Partial<RawMatch>): RawMatch => ({
  id: 9001,
  utcDate: "2026-06-11T19:00:00Z",
  status: "FINISHED",
  stage: "GROUP_STAGE",
  homeTeam: { tla: "MEX" },
  awayTeam: { tla: "RSA" },
  score: { fullTime: { home: 2, away: 0 } },
  ...overrides,
})

describe("parseFeedMatches", () => {
  it("mappt ein beendetes Gruppenspiel", () => {
    const [match] = parseFeedMatches({ matches: [raw({})] })
    expect(match).toEqual({
      externalId: "9001",
      utcDate: "2026-06-11T19:00:00Z",
      status: "FINISHED",
      stage: "Gruppenphase",
      homeCode: "MEX",
      awayCode: "RSA",
      score: { home: 2, away: 0 },
      minute: null,
    })
  })

  it("addiert Penaltytore zum Gesamtendstand (Spec §4.2)", () => {
    const [match] = parseFeedMatches({
      matches: [
        raw({
          stage: "LAST_16",
          score: { fullTime: { home: 1, away: 1 }, penalties: { home: 4, away: 3 } },
        }),
      ],
    })
    expect(match?.stage).toBe("Achtelfinale")
    expect(match?.score).toEqual({ home: 5, away: 4 })
  })

  it("liefert Zwischenstand und Minute bei laufenden Spielen", () => {
    const [match] = parseFeedMatches({
      matches: [raw({ status: "IN_PLAY", minute: 67, score: { fullTime: { home: 1, away: 0 } } })],
    })
    expect(match?.status).toBe("IN_PLAY")
    expect(match?.minute).toBe(67)
    expect(match?.score).toEqual({ home: 1, away: 0 })
  })

  it("verträgt unbekannte Teams (TBD) und leere Scores", () => {
    const [match] = parseFeedMatches({
      matches: [
        raw({
          status: "TIMED",
          stage: "LAST_32",
          homeTeam: { tla: null },
          awayTeam: null,
          score: { fullTime: { home: null, away: null } },
        }),
      ],
    })
    expect(match?.stage).toBe("Sechzehntelfinale")
    expect(match?.homeCode).toBeNull()
    expect(match?.awayCode).toBeNull()
    expect(match?.score).toBeNull()
  })
})
