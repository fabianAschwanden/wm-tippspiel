// @vitest-environment node
import { describe, expect, it } from "vitest"
import { parseGoogleIdToken } from "./google"

const CLIENT_ID = "test-client.apps.googleusercontent.com"

function fakeIdToken(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${part({ alg: "RS256" })}.${part(payload)}.signatur`
}

const validPayload = {
  aud: CLIENT_ID,
  iss: "https://accounts.google.com",
  email: "Test.User@example.com",
  email_verified: true,
  name: "Test User",
}

describe("parseGoogleIdToken", () => {
  it("liefert E-Mail (kleingeschrieben) und Name", () => {
    expect(parseGoogleIdToken(fakeIdToken(validPayload), CLIENT_ID)).toEqual({
      email: "test.user@example.com",
      name: "Test User",
    })
  })

  it("fällt ohne Namen auf den E-Mail-Lokalteil zurück und kürzt auf 30 Zeichen", () => {
    const profile = parseGoogleIdToken(
      fakeIdToken({ ...validPayload, name: undefined, email: "einsehrlangerlokalteilxxxxxxxxxxxxxx@example.com" }),
      CLIENT_ID
    )
    expect(profile?.name).toBe("einsehrlangerlokalteilxxxxxxxx")
  })

  it("lehnt falsche Audience, falschen Issuer und unverifizierte E-Mail ab", () => {
    expect(parseGoogleIdToken(fakeIdToken({ ...validPayload, aud: "anderer-client" }), CLIENT_ID)).toBeNull()
    expect(parseGoogleIdToken(fakeIdToken({ ...validPayload, iss: "https://evil.example" }), CLIENT_ID)).toBeNull()
    expect(parseGoogleIdToken(fakeIdToken({ ...validPayload, email_verified: false }), CLIENT_ID)).toBeNull()
  })

  it("verträgt kaputte Tokens", () => {
    expect(parseGoogleIdToken("kein-jwt", CLIENT_ID)).toBeNull()
    expect(parseGoogleIdToken("a.b%%%.c", CLIENT_ID)).toBeNull()
    expect(parseGoogleIdToken("", CLIENT_ID)).toBeNull()
  })
})
