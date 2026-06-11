"use client"

import { useEffect, useState } from "react"
import { ScoringRules } from "components/ScoringRules/ScoringRules"
import { MATCHES } from "lib/data"
import { pointsForTip } from "lib/scoring"
import { loadTips, saveTips } from "lib/tips"
import type { Match, Tips } from "lib/types"

const STAGES = ["Gruppenphase", "Achtelfinale", "Viertelfinale", "Halbfinale", "Final"] as const

export default function TippsPage() {
  const [tips, setTips] = useState<Tips | null>(null)

  useEffect(() => {
    setTips(loadTips())
  }, [])

  const setTip = (matchId: number, side: "home" | "away", value: string) => {
    if (!tips) {
      return
    }
    const parsed = Number.parseInt(value, 10)
    const goals = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(20, parsed))
    const current = tips[matchId] ?? { home: 0, away: 0 }
    const next: Tips = { ...tips, [matchId]: { ...current, [side]: goals } }
    setTips(next)
    saveTips(next)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Tipp-Abgabe</h1>
          <p className="mt-1 text-sm text-gray-400">Tipps werden automatisch gespeichert.</p>
        </div>
        <ScoringRules />
      </div>

      {STAGES.map((stage) => {
        const matches = MATCHES.filter((m) => m.stage === stage)
        if (matches.length === 0) {
          return null
        }
        return (
          <section key={stage}>
            <h2 className="mb-3 text-sm font-bold tracking-widest text-emerald-300 uppercase">{stage}</h2>
            <ul className="space-y-3">
              {matches.map((match) => (
                <MatchTipRow key={match.id} match={match} tips={tips} onTip={setTip} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function MatchTipRow({
  match,
  tips,
  onTip,
}: {
  match: Match
  tips: Tips | null
  onTip: (matchId: number, side: "home" | "away", value: string) => void
}) {
  const tip = tips?.[match.id]
  const finished = Boolean(match.result)
  const earned = finished && tip && match.result ? pointsForTip(tip, match.result) : null

  return (
    <li className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
      <div className="flex items-center justify-between gap-2">
        {/* Heim */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
          <span className="hidden truncate font-semibold sm:block">{match.home.name}</span>
          <span className="font-semibold sm:hidden">{match.home.code}</span>
          <span className="text-2xl" aria-hidden>
            {match.home.flag}
          </span>
        </div>

        {/* Eingabe / Resultat */}
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            aria-label={`Tore ${match.home.name}`}
            disabled={finished || !tips}
            value={tip?.home ?? ""}
            onChange={(e) => onTip(match.id, "home", e.target.value)}
            className="h-11 w-12 rounded-lg border border-gray-700 bg-gray-950 text-center text-lg font-bold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
          />
          <span className="text-gray-500">:</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            aria-label={`Tore ${match.away.name}`}
            disabled={finished || !tips}
            value={tip?.away ?? ""}
            onChange={(e) => onTip(match.id, "away", e.target.value)}
            className="h-11 w-12 rounded-lg border border-gray-700 bg-gray-950 text-center text-lg font-bold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Auswärts */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {match.away.flag}
          </span>
          <span className="hidden truncate font-semibold sm:block">{match.away.name}</span>
          <span className="font-semibold sm:hidden">{match.away.code}</span>
        </div>
      </div>

      {finished && match.result && (
        <p className="mt-2 text-center text-xs text-gray-400">
          Endstand{" "}
          <span className="font-bold text-white">
            {match.result.home}:{match.result.away}
          </span>
          {earned !== null && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 font-bold ${
                earned > 0 ? "bg-emerald-700 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              +{earned} P
            </span>
          )}
        </p>
      )}
    </li>
  )
}
