"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { BONUS_QUESTIONS } from "lib/bonus"
import { BASE_RULES } from "lib/scoring"

const PHASES = [
  { title: "Gruppenphase", factor: 1 },
  { title: "K.o.-Phase (zählt doppelt)", factor: 2 },
] as const

/** Popup, das das Punktesystem erklärt. */
export function ScoringRules() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="rounded-full border border-emerald-700 px-4 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/60">
        Punktesystem ℹ️
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-emerald-800 bg-gray-900 p-6 shadow-2xl">
          <Dialog.Title className="text-xl font-bold text-amber-300">So zählen deine Tipps</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-400">
            Die Punkte je Spiel addieren sich — ein exakter Tipp bringt 10 Punkte in der Gruppenphase und 20 in der
            K.o.-Phase.
          </Dialog.Description>

          {PHASES.map(({ title, factor }) => (
            <div key={title} className="mt-4">
              <h3 className="text-sm font-bold tracking-widest text-emerald-300 uppercase">{title}</h3>
              <ul className="mt-2 space-y-2">
                {BASE_RULES.map(({ points, rule, example }) => (
                  <li key={rule} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {points * factor}
                    </span>
                    <span>
                      <span className="block font-medium text-white">{rule}</span>
                      {example && <span className="block text-xs text-gray-400">{example}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-4">
            <h3 className="text-sm font-bold tracking-widest text-emerald-300 uppercase">Zusatzfragen</h3>
            <ul className="mt-2 space-y-2">
              {BONUS_QUESTIONS.map(({ id, question, points }) => (
                <li key={id} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-amber-950">
                    {points}
                  </span>
                  <span className="font-medium text-white">{question}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 rounded-xl bg-gray-800/60 px-3 py-2 text-xs text-gray-400">
            Resultate kommen automatisch aus dem Datenfeed; gewertet wird der Gesamtendstand (in der K.o.-Runde
            inklusive Verlängerung und Penaltys). Zusatzfragen sind bis zum Anstoss des ersten K.o.-Spiels änderbar.
          </p>
          <Dialog.Close className="mt-6 w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-500">
            Verstanden
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
