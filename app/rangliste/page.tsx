"use client"

import { useEffect, useState } from "react"
import { buildLeaderboard } from "lib/leaderboard"
import { loadTips } from "lib/tips"
import type { Tips } from "lib/types"

const MEDALS = ["🥇", "🥈", "🥉"]

export default function RanglistePage() {
  const [tips, setTips] = useState<Tips | null>(null)

  useEffect(() => {
    setTips(loadTips())
  }, [])

  const players = buildLeaderboard(tips ?? {})

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Rangliste</h1>
      <p className="mt-1 mb-4 text-sm text-gray-400">Alle Mitspielenden im Überblick.</p>
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
            {players.map((player, index) => (
              <tr key={player.name} className={player.isCurrentUser ? "bg-emerald-900/40" : undefined}>
                <td className="px-4 py-3 font-bold text-amber-300 tabular-nums">{MEDALS[index] ?? index + 1}</td>
                <td className="px-4 py-3 font-medium">
                  {player.name}
                  {player.isCurrentUser && (
                    <span className="ml-2 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold">Du</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-lg font-extrabold text-white tabular-nums">
                  {tips || !player.isCurrentUser ? player.points : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
