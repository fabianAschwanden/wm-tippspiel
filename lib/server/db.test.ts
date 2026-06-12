// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest"
import {
  allPlayersWithTips,
  bonusTipsForPlayer,
  consumeAuthToken,
  createAuthToken,
  createSession,
  deleteSession,
  findPlayerByEmail,
  markVerified,
  playerAuthByEmail,
  playerBySession,
  registerPlayer,
  setPassword,
  tipsForPlayer,
  upsertBonusTip,
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

describe("bonus-tips", () => {
  it("legt Zusatzfragen-Tipps an, überschreibt sie und liefert sie in der Ranglisten-Abfrage", async () => {
    const player = (await registerPlayer("Bonus", "bonus@example.com"))!
    await upsertBonusTip(player.id, "weltmeister", "BRA")
    await upsertBonusTip(player.id, "weltmeister", "SUI")
    await upsertBonusTip(player.id, "vize", "GER")
    expect(await bonusTipsForPlayer(player.id)).toEqual({ weltmeister: "SUI", vize: "GER" })
    const everyone = await allPlayersWithTips()
    expect(everyone.find((p) => p.id === player.id)?.bonus).toEqual({ weltmeister: "SUI", vize: "GER" })
  })
})

describe("auth-tokens und verifikation", () => {
  it("löst Tokens genau einmal und nur für den richtigen Zweck ein", async () => {
    const player = (await registerPlayer("Tok", "tok@example.com"))!
    const token = await createAuthToken(player.id, "verify")
    expect(await consumeAuthToken(token, "reset")).toBeNull()
    expect(await consumeAuthToken(token, "verify")).toBe(player.id)
    expect(await consumeAuthToken(token, "verify")).toBeNull()
  })

  it("speichert Passwort-Hash und Verifikationsstatus", async () => {
    const player = (await registerPlayer("Ver", "ver@example.com", "scrypt:salz:hash"))!
    let auth = await playerAuthByEmail("ver@example.com")
    expect(auth?.passwordHash).toBe("scrypt:salz:hash")
    expect(auth?.verified).toBe(false)
    await markVerified(player.id)
    await setPassword(player.id, "scrypt:neu:hash")
    auth = await playerAuthByEmail("ver@example.com")
    expect(auth?.verified).toBe(true)
    expect(auth?.passwordHash).toBe("scrypt:neu:hash")
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
