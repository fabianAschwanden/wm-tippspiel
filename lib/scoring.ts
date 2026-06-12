import type { Match, Score, Stage, Tips } from "./types"

/**
 * Punktesystem (additiv, K.o.-Spiele zählen doppelt):
 *   5 P — richtiger Sieger bzw. Unentschieden (Tendenz)
 *   1 P — richtige Anzahl Heim-Tore
 *   1 P — richtige Anzahl Gast-Tore
 *   3 P — richtige Tordifferenz; bei einem Sieg muss der getippte Sieger stimmen
 * Exakter Tipp = 10 P (Gruppenphase) bzw. 20 P (K.o.-Phase).
 * Zusatzfragen: 50 P Weltmeister, 20 P jede weitere (lib/bonus.ts).
 */
export const BASE_RULES = [
  { points: 5, rule: "Richtiger Sieger oder Unentschieden", example: "unabhängig von der Anzahl Tore" },
  { points: 1, rule: "Richtige Anzahl Heim-Tore", example: "" },
  { points: 1, rule: "Richtige Anzahl Gast-Tore", example: "" },
  { points: 3, rule: "Richtige Tordifferenz", example: "bei einem Sieg muss der getippte Sieger stimmen" },
] as const

/** K.o.-Spiele zählen doppelt. */
export function stageFactor(stage: Stage): number {
  return stage === "Gruppenphase" ? 1 : 2
}

/** Höchstpunktzahl (exakter Tipp) für ein Spiel der jeweiligen Phase. */
export function maxPointsFor(stage: Stage): number {
  return 10 * stageFactor(stage)
}

const tendency = (score: Score): number => Math.sign(score.home - score.away)

export function pointsForTip(tip: Score, result: Score, stage: Stage): number {
  const factor = stageFactor(stage)
  let points = 0
  if (tendency(tip) === tendency(result)) {
    points += 5 * factor
  }
  if (tip.home === result.home) {
    points += 1 * factor
  }
  if (tip.away === result.away) {
    points += 1 * factor
  }
  // vorzeichenbehaftete Differenz: bei einem Sieg stimmt damit automatisch der Sieger
  if (tip.home - tip.away === result.home - result.away) {
    points += 3 * factor
  }
  return points
}

/** Summe über alle beendeten Spiele, für die ein Tipp vorliegt. */
export function totalPoints(tips: Tips, matches: Match[]): number {
  return matches.reduce((sum, match) => {
    const tip = tips[match.id]
    if (!match.result || !tip) {
      return sum
    }
    return sum + pointsForTip(tip, match.result, match.stage)
  }, 0)
}

/** Anzahl exakt getippter Resultate (Tie-Breaker der Rangliste). */
export function countExactTips(tips: Tips, matches: Match[]): number {
  return matches.reduce((count, match) => {
    const tip = tips[match.id]
    if (!match.result || !tip) {
      return count
    }
    return count + (tip.home === match.result.home && tip.away === match.result.away ? 1 : 0)
  }, 0)
}
