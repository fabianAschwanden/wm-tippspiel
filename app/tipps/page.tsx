"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ScoreStepper } from "components/ScoreStepper/ScoreStepper"
import { ScoringRules } from "components/ScoringRules/ScoringRules"
import { fetchMatchTips, fetchMe, fetchTips, saveTip, syncResults } from "lib/api"
import { dayKey, dayLabel, timeLabel } from "lib/dates"
import { useLive, useMatches } from "lib/hooks"
import { pointsForTip } from "lib/scoring"
import type { LiveScore, Match, PlayerAccount, Score, Tips } from "lib/types"

/** Wie nah der Tipp am Resultat war (Punktesystem 3/2/1/0). */
const POINTS_LABEL: Record<number, string> = {
  3: "exakt",
  2: "Tordifferenz",
  1: "Tendenz",
  0: "daneben",
}

export default function TippsPage() {
  const [player, setPlayer] = useState<PlayerAccount | null>(null)
  const [tips, setTips] = useState<Tips | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { matches, refresh } = useMatches()
  const live = useLive()
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

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

  /** Spielplan chronologisch, gruppiert nach Kalendertag (Schweizer Zeit). */
  const matchDays = useMemo(() => {
    const days: { key: string; matches: Match[] }[] = []
    for (const match of [...matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff))) {
      const key = dayKey(match.kickoff)
      const day = days[days.length - 1]
      if (day && day.key === key) {
        day.matches.push(match)
      } else {
        days.push({ key, matches: [match] })
      }
    }
    return days
  }, [matches])

  const liveByMatch = useMemo(() => new Map((live?.scores ?? []).map((s) => [s.matchId, s])), [live])

  const setTip = (matchId: number, side: "home" | "away", goals: number) => {
    if (!tips || !player) {
      return
    }
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
  const isStarted = (match: Match) => now === null || new Date(match.kickoff).getTime() <= now

  const doSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    const result = await syncResults()
    setSyncing(false)
    if (result.error) {
      setSyncMessage(result.error)
      return
    }
    if (result.throttled) {
      setSyncMessage("Gerade erst abgeglichen — bitte einen Moment warten.")
      return
    }
    const fresh = result.stats?.results ?? 0
    setSyncMessage(fresh === 1 ? "1 neuer Endstand übernommen." : `${fresh} neue Endstände übernommen.`)
    await refresh()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Tipp-Abgabe</h1>
          <p className="mt-1 text-sm text-gray-400">Tipps werden automatisch gespeichert — bis zum Anstoss.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {player && (
            <button
              type="button"
              onClick={() => void doSync()}
              disabled={syncing}
              title="Resultate jetzt mit dem Datenfeed abgleichen"
              className="flex items-center gap-1.5 rounded-full border border-emerald-700 px-4 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/60 disabled:opacity-50"
            >
              <span className={syncing ? "animate-spin" : undefined} aria-hidden>
                ↻
              </span>
              <span className="hidden sm:inline">{syncing ? "Gleicht ab …" : "Resultate abgleichen"}</span>
            </button>
          )}
          <ScoringRules />
        </div>
      </div>

      {syncMessage && (
        <p role="status" className="rounded-2xl border border-gray-800 bg-gray-900/80 px-4 py-3 text-sm text-gray-300">
          {syncMessage}
        </p>
      )}

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

      {matchDays.map(({ key, matches: dayMatches }) => {
        const first = dayMatches[0]
        if (!first) {
          return null
        }
        const stages = Array.from(new Set(dayMatches.map((m) => m.stage))).join(" · ")
        return (
          <section key={key}>
            <h2 className="mb-3 rounded-xl border border-gray-800 bg-gray-800/60 px-4 py-2.5 text-sm font-bold text-white">
              {stages} <span className="text-gray-500">·</span>{" "}
              <span className="text-emerald-300">{dayLabel(first.kickoff, now)}</span>
            </h2>
            <ul className="space-y-3">
              {dayMatches.map((match) => (
                <MatchTipRow
                  key={match.id}
                  match={match}
                  tips={tips}
                  locked={Boolean(match.result) || isStarted(match) || !player}
                  live={liveByMatch.get(match.id)}
                  canReveal={Boolean(player) && isStarted(match) && now !== null}
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
  live,
  canReveal,
  onTip,
}: {
  match: Match
  tips: Tips | null
  locked: boolean
  live: LiveScore | undefined
  canReveal: boolean
  onTip: (matchId: number, side: "home" | "away", goals: number) => void
}) {
  const tip = tips?.[match.id]
  const finished = Boolean(match.result)
  const earned = finished && tip && match.result ? pointsForTip(tip, match.result) : null
  const liveScore: Score | null =
    live && live.home !== null && live.away !== null ? { home: live.home, away: live.away } : null
  const liveEarned = !finished && liveScore && tip ? pointsForTip(tip, liveScore) : null

  // beendete Spiele werden nach Tipp-Erfolg eingefärbt
  const cardTone = !finished
    ? "border-gray-800 bg-gray-900/80"
    : earned === 3
      ? "border-emerald-500/70 bg-emerald-950/50"
      : earned === 2
        ? "border-emerald-700/60 bg-emerald-950/30"
        : earned === 1
          ? "border-amber-600/50 bg-amber-950/25"
          : earned === 0
            ? "border-red-900/70 bg-red-950/20"
            : "border-gray-700 bg-gray-800/40" // beendet, aber kein Tipp abgegeben

  return (
    <li className={`rounded-2xl border p-4 ${cardTone}`}>
      <div className="mb-3 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-emerald-300">
          {match.group ? `Gruppe ${match.group}` : `Spiel ${match.id}`}
        </span>
        <span className="flex items-center gap-2 text-gray-400">
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/80 px-2 py-0.5 font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
              {live.status === "PAUSED" ? "Pause" : "LIVE"}
              {live.minute !== null ? ` ${live.minute}’` : ""}
            </span>
          )}
          {timeLabel(match.kickoff)}
          {match.venue ? ` · ${match.venue}` : ""}
        </span>
      </div>
      {/* Mobil: Teams in einer Zeile, Tipp-Eingabe darunter; ab sm alles in einer Zeile */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        {/* Heim */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right" title={match.home.name}>
          <span className="truncate font-semibold">{match.home.name}</span>
          <span className="text-2xl" aria-hidden>
            {match.home.flag}
          </span>
        </div>

        {/* Eingabe bzw. Endstand */}
        {finished && match.result ? (
          <div className="shrink-0 text-center">
            <span className="text-2xl font-extrabold text-white tabular-nums">
              {match.result.home}:{match.result.away}
            </span>
            <span className="block text-[10px] tracking-widest text-gray-400 uppercase">Endstand</span>
          </div>
        ) : (
          <>
            <span className="shrink-0 text-sm text-gray-600 sm:hidden">vs</span>
            <div className="order-last flex w-full items-center justify-center gap-2 sm:order-none sm:w-auto">
              <ScoreStepper
                value={tip?.home ?? null}
                ariaLabel={`Tore ${match.home.name}`}
                disabled={locked || !tips}
                onChange={(goals) => onTip(match.id, "home", goals)}
              />
              <span className="text-gray-500">:</span>
              <ScoreStepper
                value={tip?.away ?? null}
                ariaLabel={`Tore ${match.away.name}`}
                disabled={locked || !tips}
                onChange={(goals) => onTip(match.id, "away", goals)}
              />
            </div>
          </>
        )}

        {/* Auswärts */}
        <div className="flex min-w-0 flex-1 items-center gap-2" title={match.away.name}>
          <span className="text-2xl" aria-hidden>
            {match.away.flag}
          </span>
          <span className="truncate font-semibold">{match.away.name}</span>
        </div>
      </div>

      {finished &&
        match.result &&
        (tip && earned !== null ? (
          <p className="mt-2.5 flex items-center justify-center gap-2 text-center text-xs text-gray-300">
            Dein Tipp{" "}
            <span className="font-bold text-white tabular-nums">
              {tip.home}:{tip.away}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-bold ${
                earned === 3
                  ? "bg-emerald-500 text-emerald-950"
                  : earned === 2
                    ? "bg-emerald-700 text-white"
                    : earned === 1
                      ? "bg-amber-600 text-amber-950"
                      : "bg-red-900/80 text-red-200"
              }`}
            >
              +{earned} P · {POINTS_LABEL[earned]}
            </span>
          </p>
        ) : (
          <p className="mt-2.5 text-center text-xs text-gray-500">Kein Tipp abgegeben — 0 P</p>
        ))}

      {!finished && liveScore && (
        <p className="mt-2 text-center text-xs text-gray-400">
          Zwischenstand{" "}
          <span className="font-bold text-white">
            {liveScore.home}:{liveScore.away}
          </span>
          {liveEarned !== null && (
            <span className="ml-2 animate-pulse rounded-full border border-dashed border-emerald-500 px-2 py-0.5 font-bold text-emerald-300">
              +{liveEarned} P live
            </span>
          )}
        </p>
      )}

      {canReveal && <OtherTips matchId={match.id} />}
    </li>
  )
}

/** Tipps der anderen — erst nach Anstoss einsehbar (Spec §4.4). */
function OtherTips({ matchId }: { matchId: number }) {
  const [others, setOthers] = useState<{ name: string; tip: Score }[] | null>(null)
  const [open, setOpen] = useState(false)

  const toggle = () => {
    setOpen(!open)
    if (!others) {
      void fetchMatchTips(matchId).then(setOthers)
    }
  }

  return (
    <div className="mt-2 text-center text-xs">
      <button
        type="button"
        onClick={toggle}
        className="text-gray-500 underline-offset-2 transition-colors hover:text-emerald-300 hover:underline"
      >
        {open ? "Tipps der anderen ausblenden" : "Tipps der anderen anzeigen"}
      </button>
      {open && others && (
        <p className="mt-1 text-gray-400">
          {others.length === 0
            ? "Niemand hat dieses Spiel getippt."
            : others.map(({ name, tip }) => `${name} ${tip.home}:${tip.away}`).join(" · ")}
        </p>
      )}
    </div>
  )
}
