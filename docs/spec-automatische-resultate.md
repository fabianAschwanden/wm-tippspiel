# Spec: Automatische Resultate & Punktevergabe über externe Fussball-API

Status: Entwurf zur Umsetzung · Stand: 2026-06-12 · Betrifft: wm-tippspiel

## 1. Ausgangslage und Ziel

Heute sind Spielresultate statisch in `lib/data.ts` hinterlegt (`Match.result`); Tipps und
Punkte leben je Browser im localStorage. Punkte werden bereits dynamisch berechnet
(`lib/scoring.ts`).

**Ziel:** Resultate kommen vollständig automatisch aus einer externen Fussball-Daten-API —
**ohne jede manuelle Erfassung**. Endstände lösen die Punktevergabe für alle getippten Spiele
aus, laufende Spiele werden live angezeigt. Tipps und Spieler liegen zentral in einer
Datenbank, damit alle Mitspielenden auf der Vercel-URL denselben Stand sehen. Das Punktesystem
(3/2/1/0, `pointsForTip`) bleibt unverändert.

Die Umsetzung erfolgt in zwei Stufen:

- **Stufe A — Zentrale Daten + automatische Endstände** (Login, DB, Feed-Import per Cron)
- **Stufe B — Live-Resultate** (Zwischenstände laufender Spiele, provisorische Punkte)

## 2. Scope

**In Scope**

- Zentrale Persistenz (Spieler, Tipps, Spielplan, Resultate) statt localStorage
- Nutzer-Login
- Automatischer Import der Endstände aus dem Feed; daraus automatische Punktevergabe
- Tipp-Schluss bei Anstoss (serverseitig erzwungen)
- Live-Zwischenstände mit provisorischen Punkten (Stufe B)

**Out of Scope (bewusst)**

- **Manuelle Resultaterfassung — entfällt vollständig.** Es gibt keine Erfassungs- oder
  Override-Seite; Korrekturen kommen ausschliesslich über den Feed (dessen Korrekturen werden
  automatisch übernommen). Im Störfall greift ein Datenbank-Eingriff durch den Betreiber,
  kein UI.
- Native Apps, Push-Notifications, mehrere parallele Tipprunden/Gruppen
- Eigene Verlängerungs-/Penalty-Wertung: es zählt der Gesamtendstand gemäss Feed

## 3. Use Cases

| ID | Use Case | Ablauf |
|---|---|---|
| UC-1 | Tippen | Eingeloggter Nutzer tippt Spiele bis zum jeweiligen Anstoss; danach ist das Spiel gesperrt |
| UC-2 | Resultate erhalten | Feed-Import setzt Endstände automatisch; niemand erfasst etwas von Hand |
| UC-3 | Punkte einsehen | Dashboard, Tipps-Seite (+X P je Spiel) und Rangliste zeigen jederzeit den aus den Endständen berechneten Stand |
| UC-4 | Live verfolgen | Während laufender Spiele: Zwischenstand, LIVE-Badge und provisorische Punkte (Stufe B) |

## 4. Fachregeln

1. Punktesystem unverändert: 3 P exakt · 2 P Tendenz + Tordifferenz · 1 P Tendenz · 0 P
   falsch/kein Tipp.
2. Ein Spiel gilt als **beendet**, sobald der Feed `FINISHED` meldet; es zählt der
   Gesamtendstand (inkl. Verlängerung/Penaltys gemäss Feed). Die Wertungsregel wird im
   Punktesystem-Popup ergänzt.
3. **Tipp-Schluss:** Tipps sind nur vor Anstoss (`now < kickoff`) erfass- und änderbar —
   serverseitig erzwungen, nicht nur im UI.
4. Fremde Tipps sind erst nach Anstoss des jeweiligen Spiels einsehbar.
5. Rangliste: bei Punktgleichheit entscheidet die Anzahl exakter Tipps, danach alphabetisch.
6. Punkte werden nie gespeichert, sondern stets aus Resultat × Tipp berechnet (Single Source
   of Truth).

---

# Stufe A — Zentrale Daten und automatische Endstände

## 5. Architektur

```
Browser (Next.js Pages, bestehende UI)
   │  Server Components (lesen) + Route Handlers /api (schreiben)
   ▼
Next.js auf Vercel ──── Auth.js v5 (Login)
   │
   ▼
PostgreSQL (Vercel Postgres/Neon; Alternative: Supabase) + Drizzle ORM
   ▲
   │  Upsert Endstände (einzige Schreibquelle für Resultate)
Vercel Cron (/api/cron/results, alle 15 Min während Turnierphase)
   │
   ▼
football-data.org v4 (WM 2026) — Alternativen: API-Football, OpenLigaDB
```

Entscheide (Empfehlung, austauschbar):

| Baustein | Wahl | Begründung |
|---|---|---|
| Datenbank | Vercel Postgres (Neon) | nahtlos in Vercel, kostenloser Einstieg; Supabase gleichwertig |
| ORM | Drizzle | leichtgewichtig, TypeScript-first, passt zum strict-Setup |
| Auth | Auth.js v5, E-Mail-Magic-Link | kein Passwort-Handling; Google/GitHub-Login optional |
| Resultat-Feed | football-data.org v4 | WM-Daten im Free Tier, einfache REST-API (`FOOTBALL_DATA_TOKEN`) |
| Import-Trigger | Vercel Cron | kein eigener Scheduler nötig |

## 6. Datenmodell (Postgres, Drizzle-Schema)

```
player    id (uuid, pk) · email (unique) · name · created_at
match     id (pk) · stage · group · kickoff (timestamptz) · home_code · away_code
          · result_home (int, null) · result_away (int, null)
          · external_id (Feed-Referenz, unique, not null)
tip       player_id (fk) · match_id (fk) · home (int) · away (int) · updated_at
          · pk (player_id, match_id)
```

- Teams bleiben Code-Konstanten (`lib/data.ts`); Referenz per `home_code`/`away_code`.
- Kein `result_source`, kein `is_admin` — es gibt nur eine Schreibquelle: den Feed.
- Migrationen via `drizzle-kit`. Spielplan-Seed einmalig aus dem Feed (setzt `external_id`
  und `kickoff`); der Import aktualisiert auch Anstosszeiten (Verschiebungen).

## 7. Resultat-Import

1. **Vercel Cron** ruft `/api/cron/results` auf (Schutz: `CRON_SECRET`-Header-Vergleich).
2. Handler holt Spiele des Wettbewerbs vom Feed, mappt über `external_id` und upsertet je
   Spiel: Endstand bei `FINISHED`, aktualisierten `kickoff` bei Verschiebung.
3. **Idempotenz:** mehrfacher Import desselben Stands ändert nichts. **Feed-Korrekturen**
   (nachträglich geänderte Endstände) werden beim nächsten Lauf automatisch übernommen —
   Punkte und Rangliste berechnen sich von selbst neu (Fachregel 6).
4. `POSTPONED`/`CANCELLED`: Resultat bleibt leer; bei neuem `kickoff` öffnet sich die
   Tipp-Eingabe automatisch wieder (Tipp-Schluss hängt nur an `kickoff`).

## 8. API-Schnitt (Route Handlers)

| Route | Methode | Auth | Zweck |
|---|---|---|---|
| /api/tips | GET/PUT | Login | eigene Tipps lesen/upserten (PUT validiert Tipp-Schluss, Zod) |
| /api/leaderboard | GET | Login | berechnete Rangliste |
| /api/matches | GET | Login | Spielplan inkl. Resultate |
| /api/cron/results | POST | CRON_SECRET | Feed-Import (§7) |

Lesepfade bevorzugt direkt in Server Components statt über fetch auf die eigene API.
Es existiert **kein** Schreib-Endpoint für Resultate.

## 9. Migration vom Demo-Stand

1. `lib/tips.ts` (localStorage) durch DB-Zugriffe ersetzen; Seiten von `useEffect`-Laden auf
   Server Components umstellen (Tipp-Eingabe bleibt Client Component mit PUT).
2. Statische Resultate in `MATCHES`, `DEMO_TIPS` und `OTHER_PLAYERS` entfallen — echte
   Spieler via Login, Resultate via Feed.
3. Optional: bestehende localStorage-Tipps beim ersten Login einmalig in die DB übernehmen.

## 10. Konfiguration (env.mjs ergänzen)

`DATABASE_URL` · `AUTH_SECRET` (+ Provider-Variablen) · `FOOTBALL_DATA_TOKEN` · `CRON_SECRET`
— alle über `@t3-oss/env-nextjs` mit Zod validiert, in Vercel als Environment Variables gesetzt.

## 11. Akzeptanzkriterien Stufe A

1. Zwei Nutzer auf zwei Geräten sehen dieselben Resultate und die gemeinsame Rangliste.
2. Ein Tipp nach Anstoss wird serverseitig abgelehnt (422), das UI sperrt das Spiel ab Anstoss.
3. Nach Spielende steht das Resultat **ohne manuelles Zutun** spätestens nach dem nächsten
   Cron-Lauf in der App; Punkte und Rangliste stimmen.
4. Korrigiert der Feed einen Endstand nachträglich, übernimmt der nächste Cron-Lauf die
   Korrektur und die Punkte passen sich an.
5. Nicht eingeloggte Besucher sehen Login, aber keine Tipps anderer.
6. Es existiert keine UI- oder API-Möglichkeit, Resultate manuell zu setzen.

## 12. Tests Stufe A

- **Vitest:** Feed-Mapping (Feed-Response → Upsert-Daten, inkl. Penalty-/Verschiebungs-Fall),
  Tipp-Schluss-Regel, Tie-Breaker der Rangliste
- **Integration:** Route Handlers gegen Test-DB (z.B. Neon Branch/pglite) — Tipp-Upsert
  vor/nach Anstoss, Cron-Idempotenz, Feed-Korrektur-Übernahme
- **Playwright:** Login → tippen → (Feed-Mock liefert Endstand) → Punkte in Dashboard/Rangliste

---

# Stufe B — Live-Resultate aus der externen Quelle

## 13. Ziel und Abgrenzung

- Stufe A importiert nur **beendete** Spiele (Cron, 15-Minuten-Takt). Stufe B ergänzt
  **laufende** Spiele: Status, Zwischenstand, Spielminute.
- Live-Daten sind **Anzeige, keine Wertung**: `pointsForTip` läuft zusätzlich über den
  Live-Stand und wird als «provisorisch» markiert; final gewertet wird erst `FINISHED`.
- Tipp-Schluss bleibt der Anstoss (§4.3) — Live-Daten ändern daran nichts.

## 14. Bezugsweg

- **Feed:** football-data.org v4 liefert Status (`IN_PLAY`, `PAUSED`, `FINISHED`) und
  Zwischenstand; die Spielminute ist im Free Tier nicht zuverlässig → Minute nur anzeigen,
  wenn geliefert, sonst Badge «LIVE». Wenn Minute/niedrigere Latenz wichtig sind:
  API-Football als alternativer Provider (Adapter-Schnittstelle, §15).
- **Kein Cron, kein WebSocket:** Vercel Cron taktet zu grob, WebSockets passen nicht zum
  Serverless-Modell. Stattdessen **Client-Polling gegen die eigene API mit serverseitigem
  Cache**:

```
Browser (SWR/Refetch alle 30–60 s, nur wenn Spiele live sind und Tab sichtbar)
   ▼
GET /api/live  ──  serverseitiger Cache 30 s (unstable_cache / s-maxage)
   ▼                 → alle Clients teilen sich EINEN Upstream-Abruf pro Intervall
football-data.org (Rate Limit Free Tier ~10 req/min bleibt so weit weg)
```

- `/api/live` antwortet aus dem Cache; ausserhalb von Spielzeiten (kein Spiel mit
  `kickoff <= now` und ohne Endstand) wird der Upstream gar nicht angefragt.
- Erreicht ein Spiel im Live-Feed `FINISHED`, schreibt derselbe Handler das Endresultat
  sofort in die DB (gleiche Upsert-Logik wie der Cron, §7) — der Cron bleibt als Fallback.

## 15. Modell und Code-Schnitt

```
lib/live/types.ts     LiveScore = { matchId, status: 'LIVE'|'PAUSED', home, away, minute? }
lib/live/provider.ts  Interface LiveProvider { fetchLiveScores(): Promise<LiveScore[]> }
lib/live/football-data.ts   Implementierung football-data.org (Mapping über external_id)
app/api/live/route.ts        Cache + Provider-Aufruf + FINISHED-Upsert
```

- Live-Stände werden **nicht** in `match.result_*` gespeichert (das bleibt dem Endstand
  vorbehalten), sondern nur im Cache gehalten und an die Clients gereicht.
- Provisorische Punkte: bestehendes `pointsForTip(tip, liveScore)` berechnen, UI kennzeichnet
  sie klar (z.B. «+2 P live», gestrichelt/pulsierend).

## 16. UI

- **Dashboard:** Sektion «Jetzt live» vor «Nächste Spiele»: Flaggen, Zwischenstand,
  Badge «LIVE» (pulsierender Punkt, emerald), Minute falls vorhanden, eigener Tipp daneben
  und provisorische Punkte.
- **Tipps-Seite:** laufende Spiele gesperrt, Zwischenstand statt «Endstand», Punkte-Badge
  als «live» markiert.
- **Rangliste:** optionaler Umschalter «inkl. laufende Spiele» — Standard bleibt die Wertung
  nur aus Endständen, damit die offizielle Reihenfolge stabil ist.
- Polling pausiert bei verstecktem Tab (Page Visibility API) und ausserhalb von Spielzeiten.

## 17. Edge Cases

| Fall | Verhalten |
|---|---|
| Feed nicht erreichbar / Rate Limit | letzter Cache-Stand mit Zeitstempel «Stand 18:42» anzeigen; kein Fehler-Banner beim ersten Fehlversuch |
| Feed meldet FINISHED, Cron noch nicht gelaufen | /api/live upsertet sofort (§14) — kein Zustand «live beendet, aber keine Punkte» |
| Spielabbruch/Verschiebung (POSTPONED u.ä.) | Resultat bleibt leer, Hinweis-Badge; bei neuem Anstoss öffnet sich die Tipp-Eingabe automatisch (§7.4) |
| Minute fehlt im Free Tier | nur «LIVE»-Badge ohne Minute |

## 18. Konfiguration

Keine neuen Pflicht-Variablen (`FOOTBALL_DATA_TOKEN` aus Stufe A reicht). Optional:
`LIVE_POLL_SECONDS` (Default 60, Client) und `LIVE_CACHE_SECONDS` (Default 30, Server) über
`env.mjs`; bei Providerwechsel zusätzlich `API_FOOTBALL_KEY`.

## 19. Akzeptanzkriterien Stufe B

1. Während eines laufenden Spiels zeigt das Dashboard innerhalb von ≤ 2 Minuten nach einem Tor
   den neuen Zwischenstand — bei beliebig vielen gleichzeitigen Nutzern mit höchstens einem
   Upstream-Request pro Cache-Intervall.
2. Provisorische Live-Punkte sind als solche gekennzeichnet und werden final, sobald das Spiel
   beendet ist.
3. Die Standard-Rangliste ändert sich durch Live-Stände nicht; der Live-Umschalter zeigt die
   Projektion.
4. Bei Feed-Ausfall bleibt die App nutzbar und zeigt den letzten Stand mit Zeitstempel.
5. Ausserhalb von Spielzeiten erzeugt die App keine Upstream-Requests.

## 20. Tests Stufe B

- **Vitest:** Provider-Mapping (IN_PLAY/PAUSED/FINISHED, fehlende Minute), Cache-Logik
  (ein Upstream-Call pro Intervall), «keine Spiele live → kein Upstream»
- **Integration:** /api/live mit gemocktem Provider — FINISHED-Upsert, Rate-Limit-/Fehlerpfad
- **Playwright:** Live-Spiel simulieren (Provider-Mock) → «Jetzt live»-Sektion, gesperrter Tipp,
  provisorische Punkte, Umschalter in der Rangliste
