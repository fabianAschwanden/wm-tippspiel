"use client"

const MIN = 0
const MAX = 20

interface ScoreStepperProps {
  /** Aktueller Wert; null = noch kein Tipp */
  value: number | null
  /** z.B. "Tore Schweiz" — Basis für die Button-Labels */
  ariaLabel: string
  disabled?: boolean
  onChange: (next: number) => void
}

/** Tor-Eingabe mit −/+-Buttons (Touch-tauglich) und direkter Zahleneingabe. */
export function ScoreStepper({ value, ariaLabel, disabled = false, onChange }: ScoreStepperProps) {
  const handleInput = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    onChange(Number.isNaN(parsed) ? MIN : Math.max(MIN, Math.min(MAX, parsed)))
  }

  const buttonClass =
    "flex h-11 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-lg font-bold text-gray-300 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-900"

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`${ariaLabel} −1`}
        disabled={disabled || (value ?? 0) <= MIN}
        onClick={() => onChange(Math.max(MIN, (value ?? 0) - 1))}
        className={buttonClass}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={MIN}
        max={MAX}
        aria-label={ariaLabel}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => handleInput(e.target.value)}
        className="h-11 w-12 rounded-lg border border-gray-700 bg-gray-950 text-center text-lg font-bold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`${ariaLabel} +1`}
        disabled={disabled || (value ?? 0) >= MAX}
        onClick={() => onChange(Math.min(MAX, (value ?? 0) + 1))}
        className={buttonClass}
      >
        +
      </button>
    </div>
  )
}
