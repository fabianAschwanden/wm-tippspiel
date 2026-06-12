import type { Score, Stage } from "../types"

export type FeedStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED"
  | "AWARDED"

/** Ein Spiel aus dem externen Feed, bereits auf unsere Begriffe gemappt. */
export interface FeedMatch {
  externalId: string
  /** Anstoss als ISO-String (UTC) */
  utcDate: string
  status: FeedStatus
  stage: Stage | null
  /** FIFA-Dreiercode; null solange das Team noch nicht feststeht (K.o.-Runde) */
  homeCode: string | null
  awayCode: string | null
  /**
   * Gesamtendstand gemäss Feed (inkl. Verlängerung; Penaltytore addiert, Spec §4.2).
   * Bei laufenden Spielen der Zwischenstand, sonst null.
   */
  score: Score | null
  /** Spielminute, falls der Feed sie liefert */
  minute: number | null
}

export interface FeedProvider {
  /** Alle Spiele des Wettbewerbs (ein Request; Aufrufer cachen/drosseln). */
  fetchMatches(): Promise<FeedMatch[]>
}
