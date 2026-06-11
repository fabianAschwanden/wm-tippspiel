"use client"

import { useState } from "react"
import { login, register } from "lib/api"

type Mode = "register" | "login"

export default function AnmeldenPage() {
  const [mode, setMode] = useState<Mode>("register")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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

      <p className="mt-4 text-center text-xs text-gray-500">
        Demo-Anmeldung ohne Passwort — die E-Mail wird nicht verifiziert.
      </p>
    </div>
  )
}
