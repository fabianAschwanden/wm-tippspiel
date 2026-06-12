"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { resetPassword } from "lib/api"

/** Neues Passwort setzen — erreicht über den Link aus der Reset-Mail (?token=…). */
export default function PasswortPage() {
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"))
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) {
      return
    }
    setError(null)
    setPending(true)
    const result = await resetPassword(token, password)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    // Passwort gesetzt + angemeldet -> volle Navigation für frischen Anmeldestatus
    window.location.assign("/")
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold">Neues Passwort setzen</h1>
      <p className="mt-1 mb-6 text-sm text-gray-400">
        Danach bist du direkt angemeldet — der Link bestätigt zugleich deine E-Mail.
      </p>

      {token === null ? (
        <p className="rounded-2xl border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Kein gültiger Link.{" "}
          <Link href="/anmelden" className="font-semibold underline underline-offset-2">
            Fordere einen neuen an
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-gray-800 bg-gray-900/80 p-6">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-gray-300">Neues Passwort</span>
            <input
              type="password"
              required
              minLength={8}
              maxLength={100}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              autoComplete="new-password"
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
            {pending ? "Einen Moment …" : "Passwort speichern"}
          </button>
        </form>
      )}
    </div>
  )
}
