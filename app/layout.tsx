import { Metadata } from "next"
import Link from "next/link"
import { UserMenu } from "components/UserMenu/UserMenu"
import "styles/tailwind.css"

export const metadata: Metadata = {
  title: "WM-Tippspiel 2026",
  description: "Fussball-WM Tippspiel — tippen, punkten, Rangliste stürmen.",
}

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/tipps", label: "Tipps" },
  { href: "/rangliste", label: "Rangliste" },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-950 bg-[radial-gradient(ellipse_at_top,rgba(16,88,48,0.35),transparent_60%)] text-white antialiased">
        <header className="sticky top-0 z-30 border-b border-emerald-900/60 bg-gray-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <span aria-hidden>⚽</span>
              <span>
                WM-Tippspiel <span className="text-amber-300">2026</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full px-3 py-1.5 text-gray-300 transition-colors hover:bg-emerald-900/60 hover:text-white"
                >
                  {label}
                </Link>
              ))}
              <UserMenu />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6 pb-16">{children}</main>
        <footer className="border-t border-emerald-900/40 py-6 text-center text-xs text-gray-500">
          Demo-Applikation auf Basis des website-templates — Anmeldung per E-Mail, Tipps werden zentral gespeichert.
        </footer>
      </body>
    </html>
  )
}
