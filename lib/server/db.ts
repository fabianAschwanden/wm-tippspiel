import { randomBytes } from "node:crypto"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import type { PlayerAccount, Score, Tips } from "../types"

export interface PlayerTips {
  id: number
  name: string
  tips: Tips
}

/**
 * Auf Vercel/Serverless ist nur /tmp beschreibbar — die DB ist dort flüchtig
 * (Demo-Betrieb: Daten gehen bei Cold Starts verloren und werden nicht über
 * Instanzen geteilt). Für persistente Daten DB_PATH auf ein Volume legen oder
 * auf eine gehostete DB wechseln.
 */
function defaultDbPath(): string {
  if (process.env.VERCEL) {
    return "/tmp/wm-tippspiel.db"
  }
  return path.join(process.cwd(), ".data", "wm-tippspiel.db")
}

let db: DatabaseSync | null = null

function getDb(): DatabaseSync {
  if (db) {
    return db
  }
  const file = process.env.DB_PATH ?? defaultDbPath()
  if (file !== ":memory:") {
    mkdirSync(path.dirname(file), { recursive: true })
  }
  db = new DatabaseSync(file)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tips (
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      match_id INTEGER NOT NULL,
      home INTEGER NOT NULL,
      away INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (player_id, match_id)
    );
  `)
  seedDemoPlayers(db)
  return db
}

/** Demo-Mitspieler beim ersten Start, damit die Rangliste nicht leer ist. */
function seedDemoPlayers(database: DatabaseSync): void {
  const count = database.prepare("SELECT count(*) AS n FROM players").get() as { n: number }
  if (count.n > 0) {
    return
  }
  const insertPlayer = database.prepare("INSERT INTO players (email, name) VALUES (?, ?)")
  const insertTip = database.prepare("INSERT INTO tips (player_id, match_id, home, away) VALUES (?, ?, ?, ?)")
  const names = ["Anna", "Marco", "Lena", "Reto", "Sara"]
  names.forEach((name, i) => {
    const { lastInsertRowid } = insertPlayer.run(`${name.toLowerCase()}@demo.example`, name)
    // deterministische Beispiel-Tipps für die ersten Gruppenspiele
    for (let matchId = 1; matchId <= 16; matchId++) {
      insertTip.run(lastInsertRowid, matchId, (i + matchId) % 4, (i * 2 + matchId) % 3)
    }
  })
}

export function findPlayerByEmail(email: string): PlayerAccount | null {
  const row = getDb().prepare("SELECT id, email, name FROM players WHERE email = ?").get(email)
  return (row as PlayerAccount | undefined) ?? null
}

/** Legt eine:n Spieler:in an; gibt null zurück, wenn die E-Mail bereits registriert ist. */
export function registerPlayer(name: string, email: string): PlayerAccount | null {
  if (findPlayerByEmail(email)) {
    return null
  }
  const { lastInsertRowid } = getDb().prepare("INSERT INTO players (email, name) VALUES (?, ?)").run(email, name)
  return { id: Number(lastInsertRowid), email, name }
}

export function createSession(playerId: number): string {
  const token = randomBytes(32).toString("hex")
  getDb().prepare("INSERT INTO sessions (token, player_id) VALUES (?, ?)").run(token, playerId)
  return token
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token)
}

export function playerBySession(token: string): PlayerAccount | null {
  const row = getDb()
    .prepare(
      `SELECT p.id, p.email, p.name FROM sessions s
       JOIN players p ON p.id = s.player_id
       WHERE s.token = ?`
    )
    .get(token)
  return (row as PlayerAccount | undefined) ?? null
}

export function tipsForPlayer(playerId: number): Tips {
  const rows = getDb().prepare("SELECT match_id, home, away FROM tips WHERE player_id = ?").all(playerId) as {
    match_id: number
    home: number
    away: number
  }[]
  const tips: Tips = {}
  for (const row of rows) {
    tips[row.match_id] = { home: row.home, away: row.away }
  }
  return tips
}

export function upsertTip(playerId: number, matchId: number, score: Score): void {
  getDb()
    .prepare(
      `INSERT INTO tips (player_id, match_id, home, away) VALUES (?, ?, ?, ?)
       ON CONFLICT (player_id, match_id)
       DO UPDATE SET home = excluded.home, away = excluded.away, updated_at = datetime('now')`
    )
    .run(playerId, matchId, score.home, score.away)
}

/** Alle Spieler:innen mit ihren Tipps, für die Rangliste. */
export function allPlayersWithTips(): PlayerTips[] {
  const players = getDb().prepare("SELECT id, name FROM players ORDER BY id").all() as { id: number; name: string }[]
  return players.map((p) => ({ ...p, tips: tipsForPlayer(p.id) }))
}
