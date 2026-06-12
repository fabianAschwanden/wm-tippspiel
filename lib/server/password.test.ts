// @vitest-environment node
import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "./password"

describe("hashPassword/verifyPassword", () => {
  it("verifiziert das richtige Passwort", () => {
    const stored = hashPassword("geheim-und-lang")
    expect(stored.startsWith("scrypt:")).toBe(true)
    expect(verifyPassword("geheim-und-lang", stored)).toBe(true)
  })

  it("lehnt falsche Passwörter ab", () => {
    const stored = hashPassword("geheim-und-lang")
    expect(verifyPassword("falsch", stored)).toBe(false)
    expect(verifyPassword("", stored)).toBe(false)
  })

  it("salzt: gleiche Passwörter ergeben verschiedene Hashes", () => {
    expect(hashPassword("gleich")).not.toBe(hashPassword("gleich"))
  })

  it("lehnt fehlende oder kaputte Hashes ab", () => {
    expect(verifyPassword("egal", null)).toBe(false)
    expect(verifyPassword("egal", "md5:abc")).toBe(false)
    expect(verifyPassword("egal", "kaputt")).toBe(false)
  })
})
