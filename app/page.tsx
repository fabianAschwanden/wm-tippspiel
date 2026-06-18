"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ScoreStepper } from "components/ScoreStepper/ScoreStepper"
import { ScoringRules } from "components/ScoringRules/ScoringRules"
import { fetchLeaderboard, fetchMe, fetchTips, saveTip } from "lib/api"
import { dayLabel, timeLabel } from "lib/dates"
import { useLive, useMatches } from "lib/hooks"
import { rankOf } from "lib/leaderboard"
import { pointsForTip } from "lib/scoring"
import type { Match, Player, PlayerAccount, Tips } from "lib/types"

const H24 = 24 * 60 * 60 * 1000

export default function Dashboard() {
  const [player, setPlayer] = useState<PlayerAccount | null>(null)
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [tips, setTips] = useState<Tips>({})
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const { matches } = useMatches()
  const live = useLive()

  useEffect(() => {
    setNow(Date.now())
    void Promise.all([fetchMe(), fetchLeaderboard()]).then(([me, players]) => {
      setPlayer(me)
      setLeaderboard(players)
      setLoaded(true)
      if (me) {
        void fetchTips().then(setTips)
      }
    })
  }, [])

  const handleTip = (matchId: number, side: "home" | "away", goals: number) => {
    const existing = tips[matchId]
    const updated = { home: 0, away: 0, ...existing, [side]: goals }
    setTips((prev) => ({ ...prev, [matchId]: updated }))
    void saveTip(matchId, updated)
  }

  const points = leaderboard.find((p) => p.isCurrentUser)?.points ?? 0
  const rank = player ? rankOf(leaderboard, player.id) : 0

  // Mindestens die nächsten 4 Spiele, plus alle weiteren innerhalb der nächsten 24h
  const upcoming = useMemo(() => {
    if (now === null) return []
    const sorted = matches
      .filter((m) => !m.result && new Date(m.kickoff).getTime() > now)
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    const base = sorted.slice(0, 4)
    const deadline =
      base.length > 0 ? Math.max(now + H24, new Date(base[base.length - 1]!.kickoff).getTime()) : now + H24
    return sorted.filter((m) => new Date(m.kickoff).getTime() <= deadline)
  }, [matches, now])

  const liveMatches = useMemo(() => {
    const byId = new Map(matches.map((m) => [m.id, m]))
    return (live?.scores ?? []).flatMap((score) => {
      const match = byId.get(score.matchId)
      return match ? [{ match, score }] : []
    })
  }, [matches, live])

  return (
    <div className="space-y-8">
      {/* Punktestand bzw. Registrierungs-Aufruf */}
      {loaded && !player ? (
        <section className="rounded-3xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950 to-gray-900 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm tracking-widest text-emerald-300 uppercase">Mittippen?</p>
              <p className="mt-1 text-2xl font-extrabold text-white">Registriere dich mit deiner E-Mail.</p>
              <p className="mt-2 text-sm text-gray-300">
                Danach kannst du alle 104 WM-Spiele tippen und in der Rangliste angreifen.
              </p>
              <Link
                href="/anmelden"
                className="mt-4 inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Jetzt registrieren
              </Link>
            </div>
            <ScoringRules />
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950 to-gray-900 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm tracking-widest text-emerald-300 uppercase">
                {player ? `Dein Punktestand, ${player.name}` : "Dein Punktestand"}
              </p>
              <p className="mt-1 text-5xl font-extrabold text-white tabular-nums">
                {loaded ? points : "–"}
                <span className="ml-2 text-lg font-medium text-gray-400">Punkte</span>
              </p>
              <p className="mt-2 text-sm text-gray-300">
                Rang <span className="font-bold text-amber-300">{loaded && rank > 0 ? rank : "–"}</span> von{" "}
                {leaderboard.length} —{" "}
                <Link href="/rangliste" className="text-emerald-300 underline-offset-2 hover:underline">
                  zur Rangliste
                </Link>
              </p>
            </div>
            <ScoringRules />
          </div>
        </section>
      )}

      {/* Jetzt live */}
      {liveMatches.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
              Jetzt live
            </h2>
            {live?.stale && <span className="text-xs text-gray-500">Stand {timeLabel(live.updatedAt)}</span>}
          </div>
          <ul className="space-y-3">
            {liveMatches.map(({ match, score }) => {
              const tip = tips[match.id]
              const liveScore =
                score.home !== null && score.away !== null ? { home: score.home, away: score.away } : null
              const liveEarned = tip && liveScore ? pointsForTip(tip, liveScore, match.stage) : null
              return (
                <li
                  key={match.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-2xl border border-emerald-800/60 bg-gray-900/80 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-2xl" title={match.home.name} aria-hidden>
                      {match.home.flag}
                    </span>
                    <span className="truncate font-semibold" title={match.home.name}>
                      {match.home.name}
                    </span>
                    <span className="text-xl font-extrabold text-white tabular-nums">
                      {liveScore ? `${liveScore.home}:${liveScore.away}` : "–:–"}
                    </span>
                    <span className="truncate font-semibold" title={match.away.name}>
                      {match.away.name}
                    </span>
                    <span className="text-2xl" title={match.away.name} aria-hidden>
                      {match.away.flag}
                    </span>
                  </div>
                  <div className="ml-auto shrink-0 text-right text-xs">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/80 px-2 py-0.5 font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
                      {score.status === "PAUSED" ? "Pause" : "LIVE"}
                      {score.minute !== null ? ` ${score.minute}'` : ""}
                    </p>
                    {tip && (
                      <p className="mt-1 text-gray-400">
                        Dein Tipp {tip.home}:{tip.away}
                        {liveEarned !== null && (
                          <span className="ml-1.5 font-bold text-emerald-300">+{liveEarned} P live</span>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Nächste Spiele */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Nächste Spiele</h2>
          <Link href="/tipps" className="text-sm text-emerald-400 underline-offset-2 hover:underline">
            Alle Tipps →
          </Link>
        </div>
        <ul className="space-y-3">
          {upcoming.map((match) => (
            <UpcomingMatchRow
              key={match.id}
              match={match}
              tip={tips[match.id]}
              canTip={!!player}
              now={now}
              onTip={handleTip}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}

function UpcomingMatchRow({
  match,
  tip,
  canTip,
  now,
  onTip,
}: {
  match: Match
  tip: { home: number; away: number } | undefined
  canTip: boolean
  now: number | null
  onTip: (matchId: number, side: "home" | "away", goals: number) => void
}) {
  const hasTip = tip !== undefined
  return (
    <li
      className={`rounded-2xl border p-4 transition-colors ${
        hasTip ? "border-emerald-800/50 bg-gray-900/80" : "border-gray-800 bg-gray-900/80"
      }`}
    >
      {/* Kopfzeile: Stage + Zeit */}
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium text-emerald-300">
          {match.stage === "Gruppenphase" ? `Gruppe ${match.group}` : match.stage}
        </span>
        <span>
          <span className="font-medium text-gray-300">{dayLabel(match.kickoff, now)}</span>
          {` · ${timeLabel(match.kickoff)}`}
          {match.venue ? ` · ${match.venue}` : ""}
        </span>
      </div>

      {/* Teams + Tipp-Eingabe oder angezeigter Tipp */}
      <div className="flex items-center justify-between gap-2">
        {/* Heim */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
          <span className="truncate font-semibold" title={match.home.name}>
            {match.home.name}
          </span>
          <span className="text-2xl" aria-hidden>
            {match.home.flag}
          </span>
        </div>

        {/* Mitte: Tipp-Eingabe oder Tipp anzeigen */}
        {canTip ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <ScoreStepper
              value={tip?.home ?? null}
              ariaLabel={`Tore ${match.home.name}`}
              disabled={false}
              onChange={(goals) => onTip(match.id, "home", goals)}
            />
            <span className="text-gray-500">:</span>
            <ScoreStepper
              value={tip?.away ?? null}
              ariaLabel={`Tore ${match.away.name}`}
              disabled={false}
              onChange={(goals) => onTip(match.id, "away", goals)}
            />
          </div>
        ) : (
          <span className="shrink-0 text-sm text-gray-600">vs</span>
        )}

        {/* Auswärts */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {match.away.flag}
          </span>
          <span className="truncate font-semibold" title={match.away.name}>
            {match.away.name}
          </span>
        </div>
      </div>

      {/* Tipp-Status */}
      {canTip && !hasTip && <p className="mt-2 text-center text-xs text-amber-400">Noch kein Tipp abgegeben</p>}
    </li>
  )
}
