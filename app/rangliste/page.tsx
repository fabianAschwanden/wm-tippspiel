"use client"

import { useEffect, useState } from "react"
import { fetchLeaderboard } from "lib/api"
import type { Player } from "lib/types"

const MEDALS = ["🥇", "🥈", "🥉"]

export default function RanglistePage() {
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [includeLive, setIncludeLive] = useState(false)

  useEffect(() => {
    void fetchLeaderboard(includeLive).then(setPlayers)
  }, [includeLive])

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Rangliste</h1>
      <div className="mt-1 mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-400">
          Alle registrierten Mitspielenden. Bei Punktgleichheit zählt die Anzahl exakter Tipps.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={includeLive}
            onChange={(e) => setIncludeLive(e.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
          inkl. laufende Spiele
        </label>
      </div>
      {includeLive && (
        <p className="mb-3 rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
          Projektion mit Live-Zwischenständen — die offizielle Wertung zählt nur Endstände.
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-gray-800">
        <table className="w-full text-left">
          <thead className="bg-emerald-950/60 text-xs tracking-widest text-emerald-300 uppercase">
            <tr>
              <th className="px-4 py-3">Rang</th>
              <th className="px-4 py-3">Spieler:in</th>
              <th className="px-4 py-3 text-right">Punkte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-900/80">
            {(players ?? []).map((player, index) => (
              <tr key={player.id} className={player.isCurrentUser ? "bg-emerald-900/40" : undefined}>
                <td className="px-4 py-3 font-bold text-amber-300 tabular-nums">{MEDALS[index] ?? index + 1}</td>
                <td className="px-4 py-3 font-medium">
                  {player.name}
                  {player.isCurrentUser && (
                    <span className="ml-2 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold">Du</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-lg font-extrabold text-white tabular-nums">{player.points}</span>
                  <span className="ml-2 text-xs text-gray-500">{player.exact} exakt</span>
                </td>
              </tr>
            ))}
            {players === null && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                  Lade Rangliste …
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
