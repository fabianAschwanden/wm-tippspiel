"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { SCORING_RULES } from "lib/scoring"

/** Popup, das das Punktesystem erklärt. */
export function ScoringRules() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="rounded-full border border-emerald-700 px-4 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/60">
        Punktesystem ℹ️
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-800 bg-gray-900 p-6 shadow-2xl">
          <Dialog.Title className="text-xl font-bold text-amber-300">So zählen deine Tipps</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-400">
            Punkte gibt es für jedes beendete Spiel mit abgegebenem Tipp.
          </Dialog.Description>
          <ul className="mt-4 space-y-3">
            {SCORING_RULES.map(({ points, rule, example }) => (
              <li key={rule} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  {points}
                </span>
                <span>
                  <span className="block font-medium text-white">{rule}</span>
                  <span className="block text-sm text-gray-400">{example}</span>
                </span>
              </li>
            ))}
          </ul>
          <Dialog.Close className="mt-6 w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-500">
            Verstanden
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
