import { describe, expect, it } from "vitest"
import { dayKey, dayLabel, timeLabel } from "./dates"

// Referenz: 12. Juni 2026, 12:00 Uhr Schweizer Zeit (CEST = UTC+2)
const NOW = new Date("2026-06-12T10:00:00Z").getTime()

describe("dayKey", () => {
  it("liefert den Kalendertag in Schweizer Zeit", () => {
    expect(dayKey("2026-06-12T19:00:00Z")).toBe("2026-06-12")
    // 01:00 UTC = 03:00 CEST -> schon der Folgetag
    expect(dayKey("2026-06-13T01:00:00Z")).toBe("2026-06-13")
  })
})

describe("dayLabel", () => {
  it("erkennt Gestern, Heute und Morgen", () => {
    expect(dayLabel("2026-06-11T19:00:00Z", NOW)).toBe("Gestern")
    expect(dayLabel("2026-06-12T19:00:00Z", NOW)).toBe("Heute")
    expect(dayLabel("2026-06-13T01:00:00Z", NOW)).toBe("Morgen")
  })

  it("zeigt sonst Wochentag und Datum", () => {
    expect(dayLabel("2026-06-18T16:00:00Z", NOW)).toBe("Donnerstag, 18. Juni")
    expect(dayLabel("2026-07-19T19:00:00Z", NOW)).toBe("Sonntag, 19. Juli")
  })

  it("ist ohne now immer absolut (stabiler Server-Render)", () => {
    expect(dayLabel("2026-06-12T19:00:00Z")).toBe("Freitag, 12. Juni")
    expect(dayLabel("2026-06-12T19:00:00Z", null)).toBe("Freitag, 12. Juni")
  })
})

describe("timeLabel", () => {
  it("liefert die Anstosszeit in Schweizer Zeit", () => {
    expect(timeLabel("2026-06-12T19:00:00Z")).toBe("21:00")
    expect(timeLabel("2026-06-13T01:00:00Z")).toBe("03:00")
  })
})
