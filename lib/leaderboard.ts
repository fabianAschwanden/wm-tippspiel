import { CURRENT_USER_NAME, MATCHES, OTHER_PLAYERS } from "./data"
import { totalPoints } from "./scoring"
import type { Player, Tips } from "./types"

/** Rangliste inkl. aktuellem Nutzer, absteigend nach Punkten. */
export function buildLeaderboard(tips: Tips): Player[] {
  const me: Player = { name: CURRENT_USER_NAME, points: totalPoints(tips, MATCHES), isCurrentUser: true }
  return [...OTHER_PLAYERS, me].sort((a, b) => b.points - a.points)
}

export function rankOf(players: Player[], name: string): number {
  return players.findIndex((p) => p.name === name) + 1
}
