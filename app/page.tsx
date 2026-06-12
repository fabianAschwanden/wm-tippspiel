"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ScoringRules } from "components/ScoringRules/ScoringRules"
import { fetchLeaderboard, fetchMe, fetchTips } from "lib/api"
import { dayLabel, timeLabel } from "lib/dates"
import { useLive, useMatches } from "lib/hooks"
import { rankOf } from "lib/leaderboard"
import { pointsForTip } from "lib/scoring"
import type { Player, PlayerAccount, Tips } from "lib/types"

export default function Dashboard() {
  const [player, setPlayer] = useState<PlayerAccount | null>(null)
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [tips, setTips] = useState<Tips>({})
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const matches = useMatches()
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

  const points = leaderboard.find((p) => p.isCurrentUser)?.points ?? 0
  const rank = player ? rankOf(leaderboard, player.id) : 0
  // erst nach Client-Mount (now gesetzt) werden bereits angepfiffene Spiele ausgeblendet
  const upcoming = matches
    .filter((m) => !m.result && (now === null || new Date(m.kickoff).getTime() > now))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .slice(0, 4)

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
              const liveEarned = tip && liveScore ? pointsForTip(tip, liveScore) : null
              return (
                <li
                  key={match.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-800/60 bg-gray-900/80 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {match.home.flag}
                    </span>
                    <span className="truncate font-semibold">{match.home.name}</span>
                    <span className="text-xl font-extrabold text-white tabular-nums">
                      {liveScore ? `${liveScore.home}:${liveScore.away}` : "–:–"}
                    </span>
                    <span className="truncate font-semibold">{match.away.name}</span>
                    <span className="text-2xl" aria-hidden>
                      {match.away.flag}
                    </span>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/80 px-2 py-0.5 font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
                      {score.status === "PAUSED" ? "Pause" : "LIVE"}
                      {score.minute !== null ? ` ${score.minute}’` : ""}
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
          <Link
            href="/tipps"
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Jetzt tippen
          </Link>
        </div>
        <ul className="space-y-3">
          {upcoming.map((match) => (
            <li
              key={match.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900/80 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {match.home.flag}
                </span>
                <span className="truncate font-semibold">{match.home.name}</span>
                <span className="text-gray-500">vs</span>
                <span className="truncate font-semibold">{match.away.name}</span>
                <span className="text-2xl" aria-hidden>
                  {match.away.flag}
                </span>
              </div>
              <div className="shrink-0 text-right text-xs text-gray-400">
                <p className="font-medium text-emerald-300">
                  {match.stage === "Gruppenphase" ? `Gruppe ${match.group}` : match.stage}
                </p>
                <p>
                  <span className="font-medium text-gray-300">{dayLabel(match.kickoff, now)}</span>
                  {` · ${timeLabel(match.kickoff)}`}
                  {match.venue ? ` · ${match.venue}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
