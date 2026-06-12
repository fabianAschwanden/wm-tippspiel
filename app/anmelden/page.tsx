"use client"

import { useEffect, useState } from "react"
import { login, register } from "lib/api"

type Mode = "register" | "login"

/** Fehlercodes aus dem Google-OAuth-Redirect (?fehler=…). */
const REDIRECT_ERRORS: Record<string, string> = {
  "google-nicht-konfiguriert": "Google-Login ist noch nicht konfiguriert (GOOGLE_CLIENT_ID/SECRET fehlen).",
  "google-abgebrochen": "Google-Anmeldung abgebrochen — bitte erneut versuchen.",
  "google-fehlgeschlagen": "Google-Anmeldung fehlgeschlagen — bitte erneut versuchen oder per E-Mail anmelden.",
}

export default function AnmeldenPage() {
  const [mode, setMode] = useState<Mode>("register")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("fehler")
    if (code) {
      setError(REDIRECT_ERRORS[code] ?? "Anmeldung fehlgeschlagen — bitte erneut versuchen.")
    }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    const result = mode === "register" ? await register(name, email) : await login(email)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    // volle Navigation, damit Header und Seiten den neuen Anmeldestatus laden
    window.location.assign("/")
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold">{mode === "register" ? "Registrieren" : "Anmelden"}</h1>
      <p className="mt-1 mb-6 text-sm text-gray-400">
        {mode === "register"
          ? "Registriere dich mit Name und E-Mail, um mitzutippen."
          : "Melde dich mit deiner registrierten E-Mail an."}
      </p>

      <div className="mb-6 flex rounded-full border border-gray-800 bg-gray-900/80 p-1 text-sm font-semibold">
        {(
          [
            ["register", "Neu registrieren"],
            ["login", "Ich bin schon dabei"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value)
              setError(null)
            }}
            className={`flex-1 rounded-full px-4 py-2 transition-colors ${
              mode === value ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-gray-800 bg-gray-900/80 p-6">
        {mode === "register" && (
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-gray-300">Name</span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wie du in der Rangliste erscheinst"
              className="h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </label>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-gray-300">E-Mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="du@example.com"
            className="h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-950/80 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-full bg-emerald-600 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "Einen Moment …" : mode === "register" ? "Registrieren & lostippen" : "Anmelden"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold tracking-widest text-gray-500 uppercase">
        <span className="h-px flex-1 bg-gray-800" aria-hidden />
        oder
        <span className="h-px flex-1 bg-gray-800" aria-hidden />
      </div>

      <a
        href="/api/auth/google"
        className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-gray-700 bg-white font-semibold text-gray-800 transition-colors hover:bg-gray-200"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        Mit Google anmelden
      </a>

      <p className="mt-4 text-center text-xs text-gray-500">
        E-Mail-Anmeldung ohne Passwort (Demo, unverifiziert) — oder verifiziert über dein Google-Konto.
      </p>
    </div>
  )
}
