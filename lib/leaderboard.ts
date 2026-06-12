import { countExactTips, totalPoints } from "./scoring"
import type { Match, Player, Tips } from "./types"

export interface LeaderboardEntry {
  id: number
  name: string
  tips: Tips
}

/**
 * Rangliste über alle Spieler:innen. Bei Punktgleichheit entscheidet die Anzahl
 * exakter Tipps, danach alphabetisch (Spec §4.5).
 */
export function buildLeaderboard(entries: LeaderboardEntry[], matches: Match[], currentPlayerId?: number): Player[] {
  return entries
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      points: totalPoints(entry.tips, matches),
      exact: countExactTips(entry.tips, matches),
      isCurrentUser: entry.id === currentPlayerId,
    }))
    .sort((a, b) => b.points - a.points || b.exact - a.exact || a.name.localeCompare(b.name, "de"))
}

export function rankOf(players: Player[], playerId: number): number {
  return players.findIndex((p) => p.id === playerId) + 1
}
