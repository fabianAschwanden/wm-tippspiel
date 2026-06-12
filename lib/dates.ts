const TIME_ZONE = "Europe/Zurich"

const keyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const dateFormat = new Intl.DateTimeFormat("de-CH", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
})

const timeFormat = new Intl.DateTimeFormat("de-CH", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
})

const DAY_MS = 24 * 60 * 60 * 1000

/** Kalendertag in der Schweizer Zeitzone, als sortierbarer Schlüssel (yyyy-mm-dd). */
export function dayKey(instant: string | number | Date): string {
  return keyFormat.format(new Date(instant))
}

/**
 * "Gestern" / "Heute" / "Morgen" relativ zu `now`, sonst Wochentag + Datum
 * (z.B. "Donnerstag, 18. Juni"). Ohne `now` (vor Client-Mount) immer absolut,
 * damit Server- und Client-Render übereinstimmen.
 */
export function dayLabel(kickoff: string, now?: number | null): string {
  if (now != null) {
    const key = dayKey(kickoff)
    if (key === dayKey(now)) {
      return "Heute"
    }
    if (key === dayKey(now + DAY_MS)) {
      return "Morgen"
    }
    if (key === dayKey(now - DAY_MS)) {
      return "Gestern"
    }
  }
  return dateFormat.format(new Date(kickoff))
}

/** Anstosszeit in der Schweizer Zeitzone, z.B. "21:00". */
export function timeLabel(kickoff: string): string {
  return timeFormat.format(new Date(kickoff))
}
