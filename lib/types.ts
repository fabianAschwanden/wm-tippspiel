export interface Team {
  code: string
  name: string
  /** Platzhalter: Emoji-Flagge, später durch Bild-Assets ersetzbar */
  flag: string
}

export type Stage =
  | "Gruppenphase"
  | "Sechzehntelfinale"
  | "Achtelfinale"
  | "Viertelfinale"
  | "Halbfinale"
  | "Spiel um Platz 3"
  | "Final"

export interface Score {
  home: number
  away: number
}

export interface Match {
  id: number
  stage: Stage
  group?: string
  /** Anstoss als ISO-String (UTC) */
  kickoff: string
  /** Austragungsort (Stadt) */
  venue?: string
  home: Team
  away: Team
  /** Nur gesetzt, wenn das Spiel beendet ist */
  result?: Score
}

/** Tipps des Nutzers, je Match-ID */
export type Tips = Record<number, Score>

/** Registriertes Spielerkonto (Session via /api/auth/*). */
export interface PlayerAccount {
  id: number
  name: string
  email: string
}

/** Eintrag in der Rangliste. */
export interface Player {
  id: number
  name: string
  points: number
  isCurrentUser?: boolean
}
