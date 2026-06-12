"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ScoringRules } from "components/ScoringRules/ScoringRules"
import { fetchLeaderboard, fetchMe } from "lib/api"
import { MATCHES } from "lib/data"
import { dayLabel, timeLabel } from "lib/dates"
import { rankOf } from "lib/leaderboard"
import type { Player, PlayerAccount } from "lib/types"

export default function Dashboard() {
  const [player, setPlayer] = useState<PlayerAccount | null>(null)
  const [leaderboard, setLeaderboard] = useState<Player[]>([])
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    void Promise.all([fetchMe(), fetchLeaderboard()]).then(([me, players]) => {
      setPlayer(me)
      setLeaderboard(players)
      setLoaded(true)
    })
  }, [])

  const points = leaderboard.find((p) => p.isCurrentUser)?.points ?? 0
  const rank = player ? rankOf(leaderboard, player.id) : 0
  // erst nach Client-Mount (now gesetzt) werden bereits angepfiffene Spiele ausgeblendet
  const upcoming = MATCHES.filter((m) => !m.result && (now === null || new Date(m.kickoff).getTime() > now))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .slice(0, 4)

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
