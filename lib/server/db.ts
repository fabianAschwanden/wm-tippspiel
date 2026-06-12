import { randomBytes } from "node:crypto"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { env } from "env.mjs"
import type { PlayerAccount, Score, Tips } from "../types"

export interface PlayerTips {
  id: number
  name: string
  tips: Tips
}

/** Minimaler gemeinsamer Nenner von @neondatabase/serverless (Pool) und PGlite. */
interface Queryable {
  query<R>(text: string, params?: unknown[]): Promise<{ rows: R[] }>
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS players (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS tips (
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    match_id INTEGER NOT NULL,
    home INTEGER NOT NULL,
    away INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, match_id)
  )`,
  // Endstände, einzige Schreibquelle ist der Feed-Import (Spec §7/§8)
  `CREATE TABLE IF NOT EXISTS results (
    match_id INTEGER PRIMARY KEY,
    home INTEGER NOT NULL,
    away INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Vom Feed gelernte Zuordnung und Korrekturen (Verschiebungen, K.o.-Paarungen)
  `CREATE TABLE IF NOT EXISTS match_meta (
    match_id INTEGER PRIMARY KEY,
    external_id TEXT UNIQUE,
    kickoff TEXT,
    home_code TEXT,
    away_code TEXT
  )`,
  // Passwort-Login + E-Mail-Verifikation (Bestands-Konten: beide Felder NULL)
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash TEXT`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`,
  // Einmal-Tokens für E-Mail-Bestätigung und Passwort-Reset (24h gültig)
  `CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
]

let dbPromise: Promise<Queryable> | null = null

/**
 * Produktion/Vercel: gehostete Postgres-DB (Neon) über DATABASE_URL.
 * Lokal ohne DATABASE_URL: PGlite (eingebettetes Postgres) in .data/pglite;
 * Tests setzen PGLITE_DATA_DIR=memory://.
 */
async function connect(): Promise<Queryable> {
  let client: Queryable
  if (env.DATABASE_URL) {
    const { Pool } = await import("@neondatabase/serverless")
    client = new Pool({ connectionString: env.DATABASE_URL })
  } else {
    const { PGlite } = await import("@electric-sql/pglite")
    const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite")
    if (!dataDir.startsWith("memory://")) {
      mkdirSync(dataDir, { recursive: true })
    }
    client = new PGlite(dataDir)
  }
  for (const statement of SCHEMA) {
    await client.query(statement)
  }
  return client
}

function getDb(): Promise<Queryable> {
  dbPromise ??= connect()
  return dbPromise
}

export async function findPlayerByEmail(email: string): Promise<PlayerAccount | null> {
  const db = await getDb()
  const { rows } = await db.query<PlayerAccount>("SELECT id, email, name FROM players WHERE email = $1", [email])
  return rows[0] ?? null
}

/** Legt eine:n Spieler:in an; gibt null zurück, wenn die E-Mail bereits registriert ist. */
export async function registerPlayer(
  name: string,
  email: string,
  passwordHash: string | null = null
): Promise<PlayerAccount | null> {
  const db = await getDb()
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO players (email, name, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id",
    [email, name, passwordHash]
  )
  const id = rows[0]?.id
  return id === undefined ? null : { id, email, name }
}

/** Spieler:in inkl. Auth-Feldern, für Login/Verifikation. */
export interface PlayerAuth extends PlayerAccount {
  passwordHash: string | null
  verified: boolean
}

export async function playerAuthByEmail(email: string): Promise<PlayerAuth | null> {
  const db = await getDb()
  const { rows } = await db.query<{
    id: number
    email: string
    name: string
    password_hash: string | null
    verified_at: string | null
  }>("SELECT id, email, name, password_hash, verified_at FROM players WHERE email = $1", [email])
  const row = rows[0]
  if (!row) {
    return null
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    verified: row.verified_at !== null,
  }
}

/** Solange die E-Mail unbestätigt ist, darf eine erneute Registrierung Name/Passwort ersetzen. */
export async function updateUnverifiedPlayer(playerId: number, name: string, passwordHash: string): Promise<void> {
  const db = await getDb()
  await db.query("UPDATE players SET name = $2, password_hash = $3 WHERE id = $1 AND verified_at IS NULL", [
    playerId,
    name,
    passwordHash,
  ])
}

export async function setPassword(playerId: number, passwordHash: string): Promise<void> {
  const db = await getDb()
  await db.query("UPDATE players SET password_hash = $2 WHERE id = $1", [playerId, passwordHash])
}

export async function markVerified(playerId: number): Promise<void> {
  const db = await getDb()
  await db.query("UPDATE players SET verified_at = coalesce(verified_at, now()) WHERE id = $1", [playerId])
}

export type TokenPurpose = "verify" | "reset"

export async function createAuthToken(playerId: number, purpose: TokenPurpose): Promise<string> {
  const token = randomBytes(32).toString("hex")
  const db = await getDb()
  await db.query("INSERT INTO auth_tokens (token, player_id, purpose) VALUES ($1, $2, $3)", [token, playerId, purpose])
  return token
}

/** Löst ein Einmal-Token ein (löscht es); null wenn unbekannt, falscher Zweck oder älter als 24h. */
export async function consumeAuthToken(token: string, purpose: TokenPurpose): Promise<number | null> {
  const db = await getDb()
  const { rows } = await db.query<{ player_id: number }>(
    `DELETE FROM auth_tokens
     WHERE token = $1 AND purpose = $2 AND created_at > now() - interval '24 hours'
     RETURNING player_id`,
    [token, purpose]
  )
  return rows[0]?.player_id ?? null
}

export async function createSession(playerId: number): Promise<string> {
  const token = randomBytes(32).toString("hex")
  const db = await getDb()
  await db.query("INSERT INTO sessions (token, player_id) VALUES ($1, $2)", [token, playerId])
  return token
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb()
  await db.query("DELETE FROM sessions WHERE token = $1", [token])
}

export async function playerBySession(token: string): Promise<PlayerAccount | null> {
  const db = await getDb()
  const { rows } = await db.query<PlayerAccount>(
    `SELECT p.id, p.email, p.name FROM sessions s
     JOIN players p ON p.id = s.player_id
     WHERE s.token = $1`,
    [token]
  )
  return rows[0] ?? null
}

export async function tipsForPlayer(playerId: number): Promise<Tips> {
  const db = await getDb()
  const { rows } = await db.query<{ match_id: number; home: number; away: number }>(
    "SELECT match_id, home, away FROM tips WHERE player_id = $1",
    [playerId]
  )
  const tips: Tips = {}
  for (const row of rows) {
    tips[row.match_id] = { home: row.home, away: row.away }
  }
  return tips
}

export async function upsertTip(playerId: number, matchId: number, score: Score): Promise<void> {
  const db = await getDb()
  await db.query(
    `INSERT INTO tips (player_id, match_id, home, away) VALUES ($1, $2, $3, $4)
     ON CONFLICT (player_id, match_id)
     DO UPDATE SET home = excluded.home, away = excluded.away, updated_at = now()`,
    [playerId, matchId, score.home, score.away]
  )
}

/** Alle Spieler:innen mit ihren Tipps, für die Rangliste. */
export async function allPlayersWithTips(): Promise<PlayerTips[]> {
  const db = await getDb()
  const { rows } = await db.query<{
    id: number
    name: string
    match_id: number | null
    home: number | null
    away: number | null
  }>(
    `SELECT p.id, p.name, t.match_id, t.home, t.away FROM players p
     LEFT JOIN tips t ON t.player_id = p.id
     ORDER BY p.id`
  )
  const players = new Map<number, PlayerTips>()
  for (const row of rows) {
    const player = players.get(row.id) ?? { id: row.id, name: row.name, tips: {} }
    if (row.match_id !== null && row.home !== null && row.away !== null) {
      player.tips[row.match_id] = { home: row.home, away: row.away }
    }
    players.set(row.id, player)
  }
  return Array.from(players.values())
}

/** Alle Tipps zu einem Spiel (Einsicht erst nach Anstoss, prüft der Aufrufer). */
export async function tipsForMatch(matchId: number): Promise<{ name: string; tip: Score }[]> {
  const db = await getDb()
  const { rows } = await db.query<{ name: string; home: number; away: number }>(
    `SELECT p.name, t.home, t.away FROM tips t
     JOIN players p ON p.id = t.player_id
     WHERE t.match_id = $1 ORDER BY p.name`,
    [matchId]
  )
  return rows.map((row) => ({ name: row.name, tip: { home: row.home, away: row.away } }))
}

/** Endstand aus dem Feed-Import; Korrekturen überschreiben (Spec §7.3). */
export async function upsertResult(matchId: number, score: Score): Promise<void> {
  const db = await getDb()
  await db.query(
    `INSERT INTO results (match_id, home, away) VALUES ($1, $2, $3)
     ON CONFLICT (match_id)
     DO UPDATE SET home = excluded.home, away = excluded.away, updated_at = now()`,
    [matchId, score.home, score.away]
  )
}

export async function allResults(): Promise<Record<number, Score>> {
  const db = await getDb()
  const { rows } = await db.query<{ match_id: number; home: number; away: number }>(
    "SELECT match_id, home, away FROM results"
  )
  const results: Record<number, Score> = {}
  for (const row of rows) {
    results[row.match_id] = { home: row.home, away: row.away }
  }
  return results
}

export interface MatchMeta {
  matchId: number
  externalId: string | null
  kickoff: string | null
  homeCode: string | null
  awayCode: string | null
}

export async function allMatchMeta(): Promise<MatchMeta[]> {
  const db = await getDb()
  const { rows } = await db.query<{
    match_id: number
    external_id: string | null
    kickoff: string | null
    home_code: string | null
    away_code: string | null
  }>("SELECT match_id, external_id, kickoff, home_code, away_code FROM match_meta")
  return rows.map((row) => ({
    matchId: row.match_id,
    externalId: row.external_id,
    kickoff: row.kickoff,
    homeCode: row.home_code,
    awayCode: row.away_code,
  }))
}

/** Merkt sich Feed-Zuordnung und -Korrekturen; nur gesetzte Felder werden überschrieben. */
export async function upsertMatchMeta(meta: {
  matchId: number
  externalId?: string
  kickoff?: string
  homeCode?: string
  awayCode?: string
}): Promise<void> {
  const db = await getDb()
  await db.query(
    `INSERT INTO match_meta (match_id, external_id, kickoff, home_code, away_code)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (match_id) DO UPDATE SET
       external_id = coalesce(excluded.external_id, match_meta.external_id),
       kickoff = coalesce(excluded.kickoff, match_meta.kickoff),
       home_code = coalesce(excluded.home_code, match_meta.home_code),
       away_code = coalesce(excluded.away_code, match_meta.away_code)`,
    [meta.matchId, meta.externalId ?? null, meta.kickoff ?? null, meta.homeCode ?? null, meta.awayCode ?? null]
  )
}
