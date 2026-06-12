# wm-tippspiel

Demo-App aus dem website-template (Next.js App Router, TS strict, Tailwind 4).
Fachlogik: lib/scoring.ts (Punkte), lib/data.ts (offizieller WM-2026-Spielplan: 104 Spiele, 48 Teams, Kickoffs in UTC).
Mehrspieler: Registrierung/Login per E-Mail (ohne Passwort, Demo) oder Google-OAuth (lib/server/google.ts, GOOGLE_CLIENT_ID/SECRET, gleiche Session/Spieler-Tabelle, Konto-Match per E-Mail), Session-Cookie; Postgres async via DATABASE_URL (Neon auf Vercel, Pool aus @neondatabase/serverless) bzw. PGlite in .data/pglite ohne DATABASE_URL — Tests: PGLITE_DATA_DIR=memory:// (lib/server/db.ts, lib/server/auth.ts). API unter app/api/ (auth, tips, leaderboard, matches, live, cron), Client-Helfer lib/api.ts + lib/hooks.ts. Tipps bis Anstoss änderbar (Server prüft, 422), fremde Tipps erst nach Anstoss einsehbar.
Resultate: ausschliesslich automatisch via football-data.org (FOOTBALL_DATA_TOKEN) — Cron-Import /api/cron/results (vercel.json, CRON_SECRET) + Live /api/live (Server-Cache); Merge in lib/server/matches.ts (currentMatches), Feed-Logik in lib/feed/. Spec: docs/spec-automatische-resultate.md.
Seiten: app/ (Dashboard), app/tipps, app/rangliste, app/anmelden. Punktesystem-Popup: components/ScoringRules (Radix Dialog).
Konventionen wie im Template: env.mjs für Env-Vars, Komponenten mit Test/Story, Conventional Commits.
Befehle: pnpm dev · pnpm test · pnpm run build
