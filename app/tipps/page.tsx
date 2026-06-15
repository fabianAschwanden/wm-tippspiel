"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ScoreStepper } from "components/ScoreStepper/ScoreStepper"
import { ScoringRules } from "components/ScoringRules/ScoringRules"
import { fetchBonus, fetchMatchTips, fetchMe, fetchTips, saveBonusTip, saveTip, syncResults } from "lib/api"
import { BONUS_QUESTIONS, bonusAnswers, bonusDeadline, type BonusTips } from "lib/bonus"
import { TEAMS } from "lib/data"
import { dayKey, dayLabel, timeLabel } from "lib/dates"
import { useLive, useMatches } from "lib/hooks"
import { maxPointsFor, pointsForTip, stageFactor } from "lib/scoring"
import type { LiveScore, Match, PlayerAccount, Score, Stage, Team, Tips } from "lib/types"

/** Wie nah der Tipp am Resultat war (additives Punktesystem, K.o. doppelt). */
function pointsLabel(earned: number, stage: Stage): string {
  const factor = stageFactor(stage)
  if (earned === maxPointsFor(stage)) {
    return "exakt"
  }
  if (earned >= 8 * factor) {
    return "Tendenz + Differenz"
  }
  if (earned >= 5 * factor) {
    return "Tendenz"
  }
  if (earned > 0) {
    return "Torzahl"
  }
  return "daneben"
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

      <BonusSection player={player} matches={matches} now={now} />

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

/** Zusatzfragen (Weltmeister etc.): Team-Auswahl, änderbar bis zum Start der K.o.-Runde. */
function BonusSection({
  player,
  matches,
  now,
}: {
  player: PlayerAccount | null
  matches: Match[]
  now: number | null
}) {
  const [bonus, setBonus] = useState<BonusTips | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (player) {
      void fetchBonus().then(setBonus)
    } else {
      setBonus({})
    }
  }, [player])

  const deadline = bonusDeadline(matches)
  const locked = !player || now === null || new Date(deadline).getTime() <= now
  const answers = bonusAnswers(matches)
  const teams = useMemo(
    () => Object.values(TEAMS as Record<string, Team>).sort((a, b) => a.name.localeCompare(b.name, "de")),
    []
  )
  const teamName = (code: string | undefined) =>
    code ? ((TEAMS as Record<string, Team>)[code]?.name ?? code) : undefined

  const pick = (questionId: string, team: string) => {
    if (!bonus || !team) {
      return
    }
    setBonus({ ...bonus, [questionId]: team })
    setError(null)
    void saveBonusTip(questionId, team).then((result) => {
      if (result.error) {
        setError(result.error)
        void fetchBonus().then(setBonus)
      }
    })
  }

  return (
    <section>
      <h2 className="mb-3 rounded-xl border border-gray-800 bg-gray-800/60 px-4 py-2.5 text-sm font-bold text-white">
        Zusatzfragen <span className="text-gray-500">·</span>{" "}
        <span className="text-emerald-300">
          änderbar bis {dayLabel(deadline, now)}, {timeLabel(deadline)}
        </span>
      </h2>
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-2xl border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      <ul className="space-y-3">
        {BONUS_QUESTIONS.map((q) => {
          const answer = answers[q.id]
          const tip = bonus?.[q.id]
          const resolved = Boolean(answer)
          const correct = resolved && tip === answer
          return (
            <li
              key={q.id}
              className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border p-4 ${
                resolved
                  ? correct
                    ? "border-emerald-500/70 bg-emerald-950/50"
                    : "border-red-900/70 bg-red-950/20"
                  : "border-gray-800 bg-gray-900/80"
              }`}
            >
              <div className="min-w-0">
                <p className="font-semibold">{q.question}</p>
                <p className="text-xs text-emerald-300">{q.points} Punkte</p>
              </div>
              <div className="flex items-center gap-2">
                {resolved && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      correct ? "bg-emerald-500 text-emerald-950" : "bg-red-900/80 text-red-200"
                    }`}
                  >
                    {correct ? `+${q.points} P` : `${teamName(answer)}`}
                  </span>
                )}
                <select
                  aria-label={q.question}
                  disabled={locked || !bonus}
                  value={tip ?? ""}
                  onChange={(e) => pick(q.id, e.target.value)}
                  className="h-11 max-w-44 rounded-lg border border-gray-700 bg-gray-950 px-2 font-semibold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">– wählen –</option>
                  {teams.map((team) => (
                    <option key={team.code} value={team.code}>
                      {team.flag} {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
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
  const earned = finished && tip && match.result ? pointsForTip(tip, match.result, match.stage) : null
  const liveScore: Score | null =
    live && live.home !== null && live.away !== null ? { home: live.home, away: live.away } : null
  const liveEarned = !finished && liveScore && tip ? pointsForTip(tip, liveScore, match.stage) : null

  // beendete Spiele werden nach Tipp-Erfolg eingefärbt
  const factor = stageFactor(match.stage)
  const cardTone = !finished
    ? "border-gray-800 bg-gray-900/80"
    : earned === null
      ? "border-gray-700 bg-gray-800/40" // beendet, aber kein Tipp abgegeben
      : earned === maxPointsFor(match.stage)
        ? "border-emerald-500/70 bg-emerald-950/50"
        : earned >= 5 * factor
          ? "border-emerald-700/60 bg-emerald-950/30"
          : earned > 0
            ? "border-amber-600/50 bg-amber-950/25"
            : "border-red-900/70 bg-red-950/20"

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
            {tip ? (
              <div className="flex items-center gap-1.5">
                <div className="text-center">
                  <span
                    className={`text-xl font-extrabold tabular-nums ${
                      earned === maxPointsFor(match.stage)
                        ? "text-emerald-400"
                        : earned !== null && earned >= 5 * stageFactor(match.stage)
                          ? "text-emerald-500"
                          : earned !== null && earned > 0
                            ? "text-amber-400"
                            : "text-red-400"
                    }`}
                  >
                    {tip.home}:{tip.away}
                  </span>
                  <span className="block text-[10px] tracking-widest text-gray-500 uppercase">Tipp</span>
                </div>
                <span className="text-sm text-gray-600">→</span>
                <div className="text-center">
                  <span className="text-xl font-extrabold text-white tabular-nums">
                    {match.result.home}:{match.result.away}
                  </span>
                  <span className="block text-[10px] tracking-widest text-gray-400 uppercase">Endstand</span>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-2xl font-extrabold text-white tabular-nums">
                  {match.result.home}:{match.result.away}
                </span>
                <span className="block text-[10px] tracking-widest text-gray-400 uppercase">Endstand</span>
              </div>
            )}
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
          <p className="mt-2.5 text-center">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                earned === maxPointsFor(match.stage)
                  ? "bg-emerald-500 text-emerald-950"
                  : earned >= 5 * factor
                    ? "bg-emerald-700 text-white"
                    : earned > 0
                      ? "bg-amber-600 text-amber-950"
                      : "bg-red-900/80 text-red-200"
              }`}
            >
              +{earned} P · {pointsLabel(earned, match.stage)}
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
