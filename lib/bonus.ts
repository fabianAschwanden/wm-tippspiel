import type { Match } from "./types"

/**
 * Zusatzfragen: Team-Tipps, die sich automatisch aus den Finalspielen auflösen.
 * 50 P für den Weltmeister, 20 P für jede weitere richtige Antwort.
 * Tippbar bis zum Anstoss des ersten K.o.-Spiels (bonusDeadline).
 */
export interface BonusQuestion {
  id: string
  question: string
  points: number
}

export const BONUS_QUESTIONS: BonusQuestion[] = [
  { id: "weltmeister", question: "Wer wird Weltmeister?", points: 50 },
  { id: "vize", question: "Wer wird Vize-Weltmeister?", points: 20 },
  { id: "dritter", question: "Wer gewinnt das Spiel um Platz 3?", points: 20 },
]

/** Antworten je Frage-ID: Team-Code */
export type BonusTips = Record<string, string>

const FINAL_ID = 104
const BRONZE_ID = 103

function winnerOf(match: Match | undefined): string | undefined {
  if (!match?.result || match.result.home === match.result.away) {
    return undefined
  }
  return match.result.home > match.result.away ? match.home.code : match.away.code
}

function loserOf(match: Match | undefined): string | undefined {
  if (!match?.result || match.result.home === match.result.away) {
    return undefined
  }
  return match.result.home > match.result.away ? match.away.code : match.home.code
}

/** Korrekte Antworten, soweit aus den Resultaten bereits ableitbar. */
export function bonusAnswers(matches: Match[]): BonusTips {
  const final = matches.find((m) => m.id === FINAL_ID)
  const bronze = matches.find((m) => m.id === BRONZE_ID)
  const answers: BonusTips = {}
  const weltmeister = winnerOf(final)
  const vize = loserOf(final)
  const dritter = winnerOf(bronze)
  if (weltmeister) {
    answers.weltmeister = weltmeister
  }
  if (vize) {
    answers.vize = vize
  }
  if (dritter) {
    answers.dritter = dritter
  }
  return answers
}

export function bonusPoints(tips: BonusTips, answers: BonusTips): number {
  return BONUS_QUESTIONS.reduce((sum, q) => {
    const tip = tips[q.id]
    return sum + (tip && tip === answers[q.id] ? q.points : 0)
  }, 0)
}

/** Zusatzfragen sind bis zum Anstoss des ersten K.o.-Spiels änderbar. */
export function bonusDeadline(matches: Match[]): string {
  const kickoffs = matches.filter((m) => m.stage !== "Gruppenphase").map((m) => m.kickoff)
  return kickoffs.sort()[0] ?? "2026-06-28T19:00:00Z"
}
