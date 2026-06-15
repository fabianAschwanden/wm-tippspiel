"use client"

import { useEffect, useState } from "react"
import { dayLabel } from "lib/dates"
import { pointsForTip } from "lib/scoring"
import type { Stage } from "lib/types"

interface PlayerTipRow {
  playerId: number
  playerName: string
  isBot: boolean
  tip: { home: number; away: number } | null
}

interface MatchWithTips {
  matchId: number
  stage: string
  homeTeam: string
  homeFlag: string
  awayTeam: string
  awayFlag: string
  kickoff: string
  result: { home: number; away: number }
  tips: PlayerTipRow[]
}

const PAGE_SIZE = 10

function tipColor(
  tip: { home: number; away: number } | null,
  result: { home: number; away: number },
  stage: Stage
): string {
  if (!tip) return "text-gray-600"
  const pts = pointsForTip(tip, result, stage)
  const max = stage === "Gruppenphase" ? 10 : 20
  if (pts === max) return "text-emerald-400 font-bold"
  if (pts >= (stage === "Gruppenphase" ? 5 : 10)) return "text-amber-300"
  if (pts > 0) return "text-orange-400"
  return "text-red-400"
}

function TipCell({
  tip,
  result,
  stage,
}: {
  tip: { home: number; away: number } | null
  result: { home: number; away: number }
  stage: Stage
}) {
  if (!tip) return <span className="text-gray-600">—</span>
  const pts = pointsForTip(tip, result, stage)
  return (
    <span className={tipColor(tip, result, stage)}>
      {tip.home}:{tip.away}
      <span className="ml-1 text-xs opacity-70">({pts}P)</span>
    </span>
  )
}

export default function ErgebnissePage() {
  const [data, setData] = useState<MatchWithTips[] | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    void fetch("/api/results/tips")
      .then((r) => r.json())
      .then((body) => setData((body as { matches: MatchWithTips[] }).matches.reverse()))
  }, [])

  if (data === null) {
    return <p className="mt-8 text-center text-sm text-gray-500">Lade Ergebnisse …</p>
  }

  if (data.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold">Ergebnisse</h1>
        <p className="mt-4 text-sm text-gray-400">Noch keine beendeten Spiele.</p>
      </div>
    )
  }

  const totalPages = Math.ceil(data.length / PAGE_SIZE)
  const paginated = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Spieler-Reihenfolge aus allen Daten ableiten (konsistent über alle Seiten)
  const allPlayers = data
    .flatMap((m) => m.tips)
    .reduce<PlayerTipRow[]>((acc, t) => {
      if (!acc.find((p) => p.playerId === t.playerId)) acc.push(t)
      return acc
    }, [])
  const columns = [...allPlayers.filter((p) => !p.isBot), ...allPlayers.filter((p) => p.isBot)]

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Ergebnisse &amp; Tipps</h1>
      <p className="mt-1 mb-5 text-sm text-gray-400">
        Tipps aller Mitspielenden zu beendeten Spielen — neueste zuerst.
      </p>

      <div className="space-y-4">
        {paginated.map((match) => (
          <div key={match.matchId} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60">
            <div className="flex items-center justify-between gap-2 border-b border-gray-800 px-4 py-3">
              <div className="flex items-center gap-2 text-base font-bold">
                <span title={match.homeTeam}>{match.homeFlag}</span>
                <span className="text-white tabular-nums">
                  {match.result.home}:{match.result.away}
                </span>
                <span title={match.awayTeam}>{match.awayFlag}</span>
              </div>
              <div className="text-right text-xs text-gray-400">
                <div>
                  {match.homeTeam} – {match.awayTeam}
                </div>
                <div>
                  {dayLabel(match.kickoff)} · {match.stage}
                </div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="py-2 pl-4 text-left font-normal">Spieler:in</th>
                  <th className="py-2 pr-4 text-right font-normal">Tipp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {columns.map((col) => {
                  const row = match.tips.find((t) => t.playerId === col.playerId)
                  return (
                    <tr key={col.playerId}>
                      <td className="py-2 pl-4 text-gray-300">
                        {col.playerName}
                        {col.isBot && (
                          <span className="ml-1.5 rounded-full bg-indigo-900/60 px-1.5 py-0.5 text-xs text-indigo-300">
                            Bot
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        <TipCell tip={row?.tip ?? null} result={match.result} stage={match.stage as Stage} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Paging */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-emerald-700 hover:text-white disabled:opacity-30"
          >
            ← Neuer
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-emerald-700 hover:text-white disabled:opacity-30"
          >
            Älter →
          </button>
        </div>
      )}

      {/* Legende */}
      <div className="mt-6 flex flex-wrap gap-3 text-xs text-gray-500">
        <span>
          <span className="text-emerald-400">■</span> exakt
        </span>
        <span>
          <span className="text-amber-300">■</span> Tendenz / Differenz
        </span>
        <span>
          <span className="text-orange-400">■</span> Torzahl
        </span>
        <span>
          <span className="text-red-400">■</span> daneben
        </span>
        <span>
          <span className="text-gray-600">—</span> nicht getippt
        </span>
      </div>
    </div>
  )
}
