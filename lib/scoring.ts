import type { Match, Score, Tips } from "./types"

/**
 * Punktesystem:
 *   3 Punkte — exaktes Ergebnis getippt
 *   2 Punkte — richtige Tendenz und richtige Tordifferenz (z.B. 2:1 getippt, 3:2 gespielt)
 *   1 Punkt  — nur richtige Tendenz (Sieg Heim / Unentschieden / Sieg Auswärts)
 *   0 Punkte — falsche Tendenz oder kein Tipp
 */
export const SCORING_RULES = [
  { points: 3, rule: "Richtiges Ergebnis", example: "2:1 getippt, 2:1 gespielt" },
  { points: 2, rule: "Richtige Tendenz + Tordifferenz", example: "2:1 getippt, 3:2 gespielt" },
  { points: 1, rule: "Richtige Tendenz", example: "2:1 getippt, 3:1 gespielt" },
  { points: 0, rule: "Falsche Tendenz", example: "2:1 getippt, 1:1 gespielt" },
] as const

const tendency = (score: Score): number => Math.sign(score.home - score.away)

export function pointsForTip(tip: Score, result: Score): number {
  if (tip.home === result.home && tip.away === result.away) {
    return 3
  }
  if (tendency(tip) !== tendency(result)) {
    return 0
  }
  if (tip.home - tip.away === result.home - result.away) {
    return 2
  }
  return 1
}

/** Summe über alle beendeten Spiele, für die ein Tipp vorliegt. */
export function totalPoints(tips: Tips, matches: Match[]): number {
  return matches.reduce((sum, match) => {
    const tip = tips[match.id]
    if (!match.result || !tip) {
      return sum
    }
    return sum + pointsForTip(tip, match.result)
  }, 0)
}

/** Anzahl exakt getippter Resultate (Tie-Breaker der Rangliste). */
export function countExactTips(tips: Tips, matches: Match[]): number {
  return matches.reduce((count, match) => {
    const tip = tips[match.id]
    if (!match.result || !tip) {
      return count
    }
    return count + (pointsForTip(tip, match.result) === 3 ? 1 : 0)
  }, 0)
}
