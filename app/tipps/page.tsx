"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ScoringRules } from "components/ScoringRules/ScoringRules"
import { fetchMe, fetchTips, saveTip } from "lib/api"
import { MATCHES } from "lib/data"
import { pointsForTip } from "lib/scoring"
import type { Match, PlayerAccount, Tips } from "lib/types"

const STAGES = [
  "Gruppenphase",
  "Sechzehntelfinale",
  "Achtelfinale",
  "Viertelfinale",
  "Halbfinale",
  "Spiel um Platz 3",
  "Final",
] as const

export default function TippsPage() {
  const [player, setPlayer] = useState<PlayerAccount | null>(null)
  const [tips, setTips] = useState<Tips | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setNow(Date.now())
    void fetchMe().then((me) => {
      setPlayer(me)
      if (me) {
        void fetchTips().then(setTips)
      } else {
        setTips({})
      }
    })
  }, [])

  const setTip = (matchId: number, side: "home" | "away", value: string) => {
    if (!tips || !player) {
      return
    }
    const parsed = Number.parseInt(value, 10)
    const goals = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(20, parsed))
    const tip = { home: 0, away: 0, ...tips[matchId], [side]: goals }
    setTips({ ...tips, [matchId]: tip })
    setError(null)
    void saveTip(matchId, tip).then((result) => {
      if (result.error) {
        setError(result.error)
        void fetchTips().then(setTips)
      }
    })
  }

  // Tipps sind bis zum Anstoss möglich; vorher gerendert = gesperrt (kein Hydration-Mismatch)
  const isLocked = (match: Match) => Boolean(match.result) || now === null || new Date(match.kickoff).getTime() <= now

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Tipp-Abgabe</h1>
          <p className="mt-1 text-sm text-gray-400">Tipps werden automatisch gespeichert — bis zum Anstoss.</p>
        </div>
        <ScoringRules />
      </div>

      {player === null && tips !== null && (
        <p className="rounded-2xl border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Du bist nicht angemeldet.{" "}
          <Link href="/anmelden" className="font-semibold underline underline-offset-2">
            Registriere dich mit deiner E-Mail
          </Link>
          , um zu tippen.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-2xl border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

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
                <MatchTipRow
                  key={match.id}
                  match={match}
                  tips={tips}
                  locked={isLocked(match) || !player}
                  onTip={setTip}
                />
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
  locked,
  onTip,
}: {
  match: Match
  tips: Tips | null
  locked: boolean
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
            disabled={locked || !tips}
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
            disabled={locked || !tips}
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
