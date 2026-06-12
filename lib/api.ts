import type { BonusTips } from "./bonus"
import type { ImportStats } from "./feed/import"
import type { LiveSnapshot, Match, Player, PlayerAccount, Score, Tips } from "./types"

/** Client-Helfer für die API-Routen. Fehler kommen als { error } mit Nicht-2xx-Status. */

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  return body?.error ?? `Unerwarteter Fehler (${response.status})`
}

export async function fetchMe(): Promise<PlayerAccount | null> {
  const response = await fetch("/api/auth/me")
  if (!response.ok) {
    return null
  }
  const body = (await response.json()) as { player: PlayerAccount | null }
  return body.player
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ pending?: boolean; verifyUrl?: string; error?: string }> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  })
  if (!response.ok) {
    return { error: await readError(response) }
  }
  return (await response.json()) as { pending: boolean; verifyUrl?: string }
}

export async function login(email: string, password: string): Promise<{ player?: PlayerAccount; error?: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) {
    return { error: await readError(response) }
  }
  return (await response.json()) as { player: PlayerAccount }
}

/** Passwort-Reset-Link anfordern (auch zum erstmaligen Passwort-Setzen für Bestands-Konten). */
export async function requestReset(email: string): Promise<{ resetUrl?: string; error?: string }> {
  const response = await fetch("/api/auth/request-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!response.ok) {
    return { error: await readError(response) }
  }
  return (await response.json()) as { resetUrl?: string }
}

export async function resetPassword(token: string, password: string): Promise<{ error?: string }> {
  const response = await fetch("/api/auth/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  })
  if (!response.ok) {
    return { error: await readError(response) }
  }
  return {}
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" })
}

export async function fetchTips(): Promise<Tips> {
  const response = await fetch("/api/tips")
  if (!response.ok) {
    return {}
  }
  const body = (await response.json()) as { tips: Tips }
  return body.tips
}

export async function saveTip(matchId: number, tip: Score): Promise<{ error?: string }> {
  const response = await fetch("/api/tips", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId, ...tip }),
  })
  if (!response.ok) {
    return { error: await readError(response) }
  }
  return {}
}

export async function fetchLeaderboard(includeLive = false): Promise<Player[]> {
  const response = await fetch(includeLive ? "/api/leaderboard?live=1" : "/api/leaderboard")
  if (!response.ok) {
    return []
  }
  const body = (await response.json()) as { players: Player[] }
  return body.players
}

/** Spielplan inkl. importierter Resultate; null bei Fehler (Aufrufer behält den statischen Stand). */
export async function fetchMatches(): Promise<Match[] | null> {
  const response = await fetch("/api/matches")
  if (!response.ok) {
    return null
  }
  const body = (await response.json()) as { matches: Match[] }
  return body.matches
}

export async function fetchLive(): Promise<LiveSnapshot | null> {
  const response = await fetch("/api/live")
  if (!response.ok) {
    return null
  }
  return (await response.json()) as LiveSnapshot
}

/** Eigene Zusatzfragen-Tipps (Weltmeister etc.). */
export async function fetchBonus(): Promise<BonusTips> {
  const response = await fetch("/api/bonus")
  if (!response.ok) {
    return {}
  }
  const body = (await response.json()) as { bonus: BonusTips }
  return body.bonus
}

export async function saveBonusTip(questionId: string, team: string): Promise<{ error?: string }> {
  const response = await fetch("/api/bonus", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, team }),
  })
  if (!response.ok) {
    return { error: await readError(response) }
  }
  return {}
}

/** Ad-hoc-Abgleich mit dem Resultat-Feed (Sync-Button). */
export async function syncResults(): Promise<{ stats?: ImportStats; throttled?: boolean; error?: string }> {
  const response = await fetch("/api/sync", { method: "POST" })
  if (!response.ok) {
    return { error: await readError(response) }
  }
  return (await response.json()) as { stats?: ImportStats; throttled?: boolean }
}

/** Tipps aller Mitspielenden zu einem Spiel (erst nach Anstoss freigegeben). */
export async function fetchMatchTips(matchId: number): Promise<{ name: string; tip: Score }[] | null> {
  const response = await fetch(`/api/matches/${matchId}/tips`)
  if (!response.ok) {
    return null
  }
  const body = (await response.json()) as { tips: { name: string; tip: Score }[] }
  return body.tips
}
