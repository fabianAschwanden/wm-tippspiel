# wm-tippspiel

Demo-App aus dem website-template (Next.js App Router, TS strict, Tailwind 4).
Fachlogik: lib/scoring.ts (Punkte), lib/data.ts (offizieller WM-2026-Spielplan: 104 Spiele, 48 Teams, Kickoffs in UTC).
Mehrspieler: Registrierung/Login per E-Mail (ohne Passwort, Demo), Session-Cookie; SQLite via node:sqlite in .data/ (lib/server/db.ts, lib/server/auth.ts), API unter app/api/ (auth, tips, leaderboard), Client-Helfer lib/api.ts. Tipps sind bis zum Anstoss änderbar (Server prüft).
Seiten: app/ (Dashboard), app/tipps, app/rangliste, app/anmelden. Punktesystem-Popup: components/ScoringRules (Radix Dialog).
Konventionen wie im Template: env.mjs für Env-Vars, Komponenten mit Test/Story, Conventional Commits.
Befehle: pnpm dev · pnpm test · pnpm run build
