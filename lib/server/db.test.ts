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
  process.env.PGLITE_DATA_DIR = "memory://"
})

describe("players", () => {
  it("registriert neue Spieler:innen und findet sie per E-Mail", async () => {
    const player = await registerPlayer("Fabian", "fabian@example.com")
    expect(player).not.toBeNull()
    expect((await findPlayerByEmail("fabian@example.com"))?.name).toBe("Fabian")
  })

  it("lehnt doppelte E-Mail ab", async () => {
    await registerPlayer("Eva", "eva@example.com")
    expect(await registerPlayer("Eva Zwei", "eva@example.com")).toBeNull()
  })
})

describe("sessions", () => {
  it("erstellt und löscht Sessions", async () => {
    const player = (await registerPlayer("Sess", "sess@example.com"))!
    const token = await createSession(player.id)
    expect((await playerBySession(token))?.id).toBe(player.id)
    await deleteSession(token)
    expect(await playerBySession(token)).toBeNull()
  })

  it("kennt unbekannte Tokens nicht", async () => {
    expect(await playerBySession("gibtsnicht")).toBeNull()
  })
})

describe("tips", () => {
  it("legt Tipps an und überschreibt sie", async () => {
    const player = (await registerPlayer("Tipp", "tipp@example.com"))!
    await upsertTip(player.id, 1, { home: 2, away: 1 })
    await upsertTip(player.id, 2, { home: 0, away: 0 })
    await upsertTip(player.id, 1, { home: 3, away: 1 })
    expect(await tipsForPlayer(player.id)).toEqual({
      1: { home: 3, away: 1 },
      2: { home: 0, away: 0 },
    })
  })

  it("liefert alle Spieler:innen mit ihren Tipps", async () => {
    const everyone = await allPlayersWithTips()
    const tipper = everyone.find((p) => p.name === "Tipp")
    expect(tipper?.tips[1]).toEqual({ home: 3, away: 1 })
    // Spieler:innen ohne Tipps erscheinen ebenfalls (mit leerem Tipps-Objekt)
    expect(everyone.find((p) => p.name === "Fabian")?.tips).toEqual({})
  })
})
