"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ScoringRules } from "components/ScoringRules/ScoringRules"
import { CURRENT_USER_NAME, MATCHES } from "lib/data"
import { buildLeaderboard, rankOf } from "lib/leaderboard"
import { totalPoints } from "lib/scoring"
import { loadTips } from "lib/tips"
import type { Tips } from "lib/types"

const kickoffFormat = new Intl.DateTimeFormat("de-CH", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Zurich",
})

export default function Dashboard() {
  const [tips, setTips] = useState<Tips | null>(null)

  useEffect(() => {
    setTips(loadTips())
  }, [])

  const points = tips ? totalPoints(tips, MATCHES) : 0
  const leaderboard = buildLeaderboard(tips ?? {})
  const rank = rankOf(leaderboard, CURRENT_USER_NAME)
  const upcoming = MATCHES.filter((m) => !m.result).slice(0, 4)

  return (
    <div className="space-y-8">
      {/* Punktestand */}
      <section className="rounded-3xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950 to-gray-900 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm tracking-widest text-emerald-300 uppercase">Dein Punktestand</p>
            <p className="mt-1 text-5xl font-extrabold text-white tabular-nums">
              {tips ? points : "–"}
              <span className="ml-2 text-lg font-medium text-gray-400">Punkte</span>
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Rang <span className="font-bold text-amber-300">{tips ? rank : "–"}</span> von {leaderboard.length} —{" "}
              <Link href="/rangliste" className="text-emerald-300 underline-offset-2 hover:underline">
                zur Rangliste
              </Link>
            </p>
          </div>
          <ScoringRules />
        </div>
      </section>

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
                <p>{kickoffFormat.format(new Date(match.kickoff))}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
