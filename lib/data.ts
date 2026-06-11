import type { Match, Player, Team, Tips } from "./types"

const T = (code: string, name: string, flag: string): Team => ({ code, name, flag })

export const TEAMS = {
  SUI: T("SUI", "Schweiz", "🇨🇭"),
  GER: T("GER", "Deutschland", "🇩🇪"),
  FRA: T("FRA", "Frankreich", "🇫🇷"),
  BRA: T("BRA", "Brasilien", "🇧🇷"),
  ARG: T("ARG", "Argentinien", "🇦🇷"),
  ESP: T("ESP", "Spanien", "🇪🇸"),
  ITA: T("ITA", "Italien", "🇮🇹"),
  POR: T("POR", "Portugal", "🇵🇹"),
  NED: T("NED", "Niederlande", "🇳🇱"),
  USA: T("USA", "USA", "🇺🇸"),
  MEX: T("MEX", "Mexiko", "🇲🇽"),
  CAN: T("CAN", "Kanada", "🇨🇦"),
  JPN: T("JPN", "Japan", "🇯🇵"),
  MAR: T("MAR", "Marokko", "🇲🇦"),
  ENG: T("ENG", "England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"),
  CRO: T("CRO", "Kroatien", "🇭🇷"),
} as const

/** Demo-Spielplan: einige Spiele beendet (mit Resultat), Rest offen. */
export const MATCHES: Match[] = [
  // Gruppenphase — beendet
  {
    id: 1,
    stage: "Gruppenphase",
    group: "A",
    kickoff: "2026-06-11T20:00:00Z",
    home: TEAMS.MEX,
    away: TEAMS.MAR,
    result: { home: 2, away: 1 },
  },
  {
    id: 2,
    stage: "Gruppenphase",
    group: "B",
    kickoff: "2026-06-12T17:00:00Z",
    home: TEAMS.SUI,
    away: TEAMS.JPN,
    result: { home: 1, away: 0 },
  },
  {
    id: 3,
    stage: "Gruppenphase",
    group: "C",
    kickoff: "2026-06-12T20:00:00Z",
    home: TEAMS.GER,
    away: TEAMS.USA,
    result: { home: 1, away: 1 },
  },
  {
    id: 4,
    stage: "Gruppenphase",
    group: "D",
    kickoff: "2026-06-13T17:00:00Z",
    home: TEAMS.BRA,
    away: TEAMS.CAN,
    result: { home: 3, away: 1 },
  },
  // Gruppenphase — offen
  { id: 5, stage: "Gruppenphase", group: "B", kickoff: "2026-06-17T17:00:00Z", home: TEAMS.SUI, away: TEAMS.ESP },
  { id: 6, stage: "Gruppenphase", group: "C", kickoff: "2026-06-17T20:00:00Z", home: TEAMS.FRA, away: TEAMS.GER },
  { id: 7, stage: "Gruppenphase", group: "E", kickoff: "2026-06-18T17:00:00Z", home: TEAMS.ARG, away: TEAMS.ITA },
  { id: 8, stage: "Gruppenphase", group: "F", kickoff: "2026-06-18T20:00:00Z", home: TEAMS.ENG, away: TEAMS.CRO },
  // K.o.-Runde — offen
  { id: 9, stage: "Achtelfinale", kickoff: "2026-06-28T17:00:00Z", home: TEAMS.NED, away: TEAMS.POR },
  { id: 10, stage: "Achtelfinale", kickoff: "2026-06-28T20:00:00Z", home: TEAMS.MEX, away: TEAMS.JPN },
  { id: 11, stage: "Viertelfinale", kickoff: "2026-07-04T17:00:00Z", home: TEAMS.BRA, away: TEAMS.FRA },
  { id: 12, stage: "Viertelfinale", kickoff: "2026-07-04T20:00:00Z", home: TEAMS.ARG, away: TEAMS.ENG },
]

/** Start-Tipps, damit die Demo direkt Punkte zeigt (werden in localStorage übernommen). */
export const DEMO_TIPS: Tips = {
  1: { home: 2, away: 1 }, // exakt -> 3 Punkte
  2: { home: 2, away: 1 }, // Tendenz + Differenz? 1:0 gespielt -> Differenz 1 -> 2 Punkte
  3: { home: 2, away: 0 }, // 1:1 gespielt -> 0 Punkte
  4: { home: 2, away: 1 }, // 3:1 gespielt -> Tendenz -> 1 Punkt
}

/** Demo-Mitspieler; die Punkte des aktuellen Nutzers werden aus den Tipps berechnet. */
export const OTHER_PLAYERS: Player[] = [
  { name: "Anna", points: 9 },
  { name: "Marco", points: 8 },
  { name: "Lena", points: 5 },
  { name: "Reto", points: 4 },
  { name: "Sara", points: 2 },
]

export const CURRENT_USER_NAME = "Du"
