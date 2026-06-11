// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest"
import {
  allPlayersWithTips,
  createSession,
  deleteSession,
  findPlayerByEmail,
  playerBySession,
  registerPlayer,
  tipsForPlayer,
  upsertTip,
} from "./db"

beforeAll(() => {
  process.env.DB_PATH = ":memory:"
})

describe("players", () => {
  it("registriert neue Spieler:innen und findet sie per E-Mail", () => {
    const player = registerPlayer("Fabian", "fabian@example.com")
    expect(player).not.toBeNull()
    expect(findPlayerByEmail("fabian@example.com")?.name).toBe("Fabian")
  })

  it("lehnt doppelte E-Mail ab", () => {
    registerPlayer("Eva", "eva@example.com")
    expect(registerPlayer("Eva Zwei", "eva@example.com")).toBeNull()
  })
})

describe("sessions", () => {
  it("erstellt und löscht Sessions", () => {
    const player = registerPlayer("Sess", "sess@example.com")!
    const token = createSession(player.id)
    expect(playerBySession(token)?.id).toBe(player.id)
    deleteSession(token)
    expect(playerBySession(token)).toBeNull()
  })

  it("kennt unbekannte Tokens nicht", () => {
    expect(playerBySession("gibtsnicht")).toBeNull()
  })
})

describe("tips", () => {
  it("legt Tipps an und überschreibt sie", () => {
    const player = registerPlayer("Tipp", "tipp@example.com")!
    upsertTip(player.id, 1, { home: 2, away: 1 })
    upsertTip(player.id, 2, { home: 0, away: 0 })
    upsertTip(player.id, 1, { home: 3, away: 1 })
    expect(tipsForPlayer(player.id)).toEqual({
      1: { home: 3, away: 1 },
      2: { home: 0, away: 0 },
    })
  })

  it("liefert alle Spieler:innen mit Tipps inkl. Demo-Seed", () => {
    const everyone = allPlayersWithTips()
    const anna = everyone.find((p) => p.name === "Anna")
    expect(anna).toBeDefined()
    expect(Object.keys(anna!.tips).length).toBeGreaterThan(0)
  })
})
