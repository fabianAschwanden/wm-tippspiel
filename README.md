# WM-Tippspiel 2026 (Demo)

Demo-Applikation auf Basis von [website-template](https://github.com/fabianAschwanden/website-template):
ein Fussball-WM-Tippspiel mit Dashboard, Tipp-Abgabe, Rangliste und erklärtem Punktesystem.

- **Dashboard** — aktueller Punktestand, Rang und die nächsten Spiele
- **Tipp-Abgabe** — Gruppenphase und K.o.-Runde, Flaggen als Platzhalter (Emojis), Auto-Save in localStorage
- **Rangliste** — alle Mitspielenden mit Punkten und Platzierung (Demo-Daten)
- **Punktesystem** — Popup: 3 P exakt · 2 P Tendenz + Tordifferenz · 1 P Tendenz · 0 P falsch
  (Logik in `lib/scoring.ts`, getestet in `lib/scoring.test.ts`)

Dunkles, sportliches Design (Rasen-Grün, Gold-Akzente), mobile first, Tailwind CSS 4.

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm test             # Vitest (inkl. Punktelogik)
pnpm run e2e:headless # Playwright
```

Demo-Grenzen: Spielplan, Resultate und Mitspielende sind statische Daten (`lib/data.ts`);
Tipps liegen im Browser. Für den echten Betrieb: Backend/API für Nutzer, Tipps und Live-Resultate.
