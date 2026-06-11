# wm-tippspiel

Demo-App aus dem website-template (Next.js App Router, TS strict, Tailwind 4).
Fachlogik: lib/scoring.ts (Punkte), lib/data.ts (Spielplan/Demo-Daten), Tipps in localStorage (lib/tips.ts).
Seiten: app/ (Dashboard), app/tipps, app/rangliste. Punktesystem-Popup: components/ScoringRules (Radix Dialog).
Konventionen wie im Template: env.mjs für Env-Vars, Komponenten mit Test/Story, Conventional Commits.
Befehle: pnpm dev · pnpm test · pnpm run build
