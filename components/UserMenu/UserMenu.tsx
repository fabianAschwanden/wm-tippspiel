"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { fetchMe, logout } from "lib/api"
import type { PlayerAccount } from "lib/types"

/** Zeigt im Header den Anmeldestatus: Link zur Anmeldung oder Name + Abmelden. */
export function UserMenu() {
  const [player, setPlayer] = useState<PlayerAccount | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void fetchMe().then((me) => {
      setPlayer(me)
      setLoaded(true)
    })
  }, [])

  if (!loaded) {
    return <span className="w-24" aria-hidden />
  }

  if (!player) {
    return (
      <Link
        href="/anmelden"
        className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
      >
        Anmelden
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden max-w-32 truncate font-semibold text-emerald-300 sm:block" title={player.email}>
        {player.name}
      </span>
      <button
        type="button"
        onClick={() => {
          void logout().then(() => window.location.assign("/"))
        }}
        className="rounded-full border border-gray-700 px-3 py-1.5 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
      >
        Abmelden
      </button>
    </div>
  )
}
