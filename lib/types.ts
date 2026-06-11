export interface Team {
  code: string
  name: string
  /** Platzhalter: Emoji-Flagge, später durch Bild-Assets ersetzbar */
  flag: string
}

export type Stage = "Gruppenphase" | "Achtelfinale" | "Viertelfinale" | "Halbfinale" | "Final"

export interface Score {
  home: number
  away: number
}

export interface Match {
  id: number
  stage: Stage
  group?: string
  /** Anstoss als ISO-String */
  kickoff: string
  home: Team
  away: Team
  /** Nur gesetzt, wenn das Spiel beendet ist */
  result?: Score
}

/** Tipps des Nutzers, je Match-ID */
export type Tips = Record<number, Score>

export interface Player {
  name: string
  points: number
  isCurrentUser?: boolean
}
