"use client"

import { useEffect, useState } from "react"
import { fetchLeaderboard } from "lib/api"
import type { Player } from "lib/types"

const MEDALS = ["🥇", "🥈", "🥉"]

export default function RanglistePage() {
  const [players, setPlayers] = useState<Player[] | null>(null)

  useEffect(() => {
    void fetchLeaderboard().then(setPlayers)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Rangliste</h1>
      <p className="mt-1 mb-4 text-sm text-gray-400">Alle registrierten Mitspielenden im Überblick.</p>
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
                <td className="px-4 py-3 text-right text-lg font-extrabold text-white tabular-nums">{player.points}</td>
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
