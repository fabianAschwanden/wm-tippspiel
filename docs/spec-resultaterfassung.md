# Spec: Resultaterfassung & automatische Punktevergabe

Status: Entwurf zur Umsetzung · Stand: 2026-06-12 · Betrifft: wm-tippspiel

## 1. Ausgangslage und Ziel

Heute sind Spielresultate statisch in `lib/data.ts` hinterlegt (`Match.result`). Punkte werden
daraus bereits dynamisch berechnet (`lib/scoring.ts`), aber Resultate können nicht in der App
erfasst werden.

**Ziel:** Resultate können in der App eingetragen, korrigiert und gelöscht werden. Die
Punktevergabe für alle getippten Spiele und die Rangliste aktualisieren sich daraus automatisch —
ohne Änderung am bestehenden Punktesystem (3/2/1/0, `pointsForTip`).

## 2. Scope

**In Scope**

- Neue Seite **/resultate** zur Erfassung der Endstände (Gruppenphase und K.o.-Runde)
- Korrektur und Löschen eines erfassten Resultats
- Automatische Neuberechnung von Punkten und Rangliste bei jeder Resultatänderung
- Sperren der Tipp-Eingabe für Spiele mit erfasstem Resultat
- Demo-Mitspieler erhalten eigene (statische) Tipps, damit ihre Punkte ebenfalls aus den
  Resultaten berechnet werden — sonst reagiert die Rangliste inkonsistent

**Out of Scope (bewusst, Demo-Grenzen)**

- Authentifizierung/Rollen (jeder kann Resultate erfassen; im echten Betrieb: Admin-Rolle)
- Backend/API, Persistenz über den Browser hinaus
- Live-Resultate aus externer Quelle
- Verlängerung/Penaltys in der K.o.-Runde (es zählt ein einziger Endstand)

## 3. Use Cases

| ID | Use Case | Ablauf |
|---|---|---|
| UC-1 | Resultat erfassen | Nutzer öffnet /resultate, trägt für ein Spiel Heim-/Auswärtstore ein → Resultat wird gespeichert, Spiel gilt als «beendet», Punkte/Rangliste aktualisieren sich |
| UC-2 | Resultat korrigieren | Nutzer ändert ein erfasstes Resultat → Punkte werden neu berechnet |
| UC-3 | Resultat löschen | Nutzer entfernt das Resultat («zurücksetzen») → Spiel gilt wieder als offen, Tipps sind wieder editierbar, Punkte werden ohne dieses Spiel berechnet |
| UC-4 | Punkte einsehen | Dashboard, Tipps-Seite (+X P je Spiel) und Rangliste zeigen jederzeit den aus den erfassten Resultaten berechneten Stand |

## 4. Fachregeln

1. Das Punktesystem bleibt unverändert: 3 P exakt · 2 P Tendenz + Tordifferenz · 1 P Tendenz ·
   0 P falsch/kein Tipp (`pointsForTip` wird nicht angepasst).
2. Ein Spiel gilt als **beendet**, sobald ein Resultat erfasst ist — unabhängig von der Anstosszeit.
3. Für beendete Spiele ist die Tipp-Eingabe gesperrt (bestehendes Verhalten, jetzt dynamisch).
4. Tore: ganze Zahlen 0–20. Ein Resultat ist nur gültig, wenn beide Werte gesetzt sind.
5. Resultatänderung wirkt sofort auf alle abgeleiteten Werte (kein «Speichern»-Knopf nötig,
   Auto-Save analog Tipp-Abgabe).

## 5. Datenmodell und Architektur

Resultate werden — analog zu den Tipps — im localStorage gehalten und über die statischen
Spieldaten gelegt:

```
lib/results.ts (neu)
  STORAGE_KEY = "wm-tippspiel.results"
  type Results = Record<number, Score>          // je Match-ID
  loadResults(): Results                        // nur im Client (useEffect)
  saveResults(results: Results): void

lib/data.ts (Änderungen)
  - MATCHES: Feld `result` entfernen — Resultate kommen nur noch aus dem Storage.
    Bisherige statische Resultate wandern als DEMO_RESULTS (Seed beim Erststart,
    analog DEMO_TIPS) nach lib/results.ts bzw. data.ts.
  - OTHER_PLAYERS: statische `points` ersetzen durch statische Tipps je Spieler:
    DEMO_PLAYER_TIPS: Record<PlayerName, Tips>

lib/matches.ts (neu, oder in data.ts)
  withResults(matches: Match[], results: Results): Match[]   // merged `result` hinein
  → alle Seiten arbeiten ausschliesslich auf dem gemergten Stand

lib/leaderboard.ts (Änderung)
  buildLeaderboard(tips: Tips, results: Results): Player[]
  → Punkte aller Spieler (inkl. Demo-Mitspieler) via totalPoints über die gemergten Matches
```

`lib/scoring.ts` bleibt unverändert. Der `Tips`-Typ (`Record<number, Score>`) wird für
`Results` wiederverwendet.

## 6. UI

**Neue Seite `/resultate`** (Client Component, Aufbau analog `/tipps`):

- Navigation im Layout um Eintrag «Resultate» ergänzen
- Spiele gruppiert nach Phase; je Spiel: Flaggen, Teams, zwei Zahleneingaben (wie Tipp-Reihe)
- Erfasstes Resultat: Badge «Beendet» (emerald), Button/Icon «Zurücksetzen» (UC-3)
- Offenes Spiel: Badge «Offen» (grau)
- Hinweistext: «Resultate gelten für alle Mitspielenden» (Demo: keine Rollen)
- Design wie bestehend: Dark Theme, Emerald/Amber-Akzente, mobile first

**Anpassungen bestehender Seiten:** keine sichtbaren — Dashboard («Nächste Spiele» = Spiele ohne
Resultat), Tipps (Sperre + «+X P») und Rangliste beziehen Resultate neu aus dem Storage-Merge.

## 7. Validierung und Edge Cases

| Fall | Verhalten |
|---|---|
| Nur ein Torwert erfasst | Resultat unvollständig → wird nicht gespeichert; visueller Hinweis (Rahmen amber) |
| Wert ausserhalb 0–20 / nicht numerisch | wie Tipp-Abgabe: clampen bzw. auf 0 setzen |
| Resultat gelöscht, Tipps existieren | Punkte des Spiels entfallen, Tipp wieder editierbar |
| Kein Tipp, aber Resultat | 0 Punkte für dieses Spiel (bestehende Regel) |
| Defekter localStorage-Inhalt | Fallback auf Seed (DEMO_RESULTS), analog loadTips |
| Storage nicht verfügbar (Private Mode) | Resultate gelten nur für die Sitzung (analog Tipps) |

## 8. Akzeptanzkriterien

1. **Erfassen:** Trage ich auf /resultate für ein offenes Spiel 2:1 ein, zeigt /tipps das Spiel
   als beendet mit «Endstand 2:1», meine Punkte auf dem Dashboard steigen gemäss Punktesystem,
   die Rangliste ordnet alle Spieler neu.
2. **Korrigieren:** Ändere ich 2:1 auf 1:1, werden alle Punkte sofort neu berechnet.
3. **Löschen:** Setze ich das Resultat zurück, ist das Spiel wieder tippbar und kein Spieler
   erhält dafür Punkte.
4. **Konsistenz:** Demo-Mitspieler-Punkte entstehen aus DEMO_PLAYER_TIPS × erfassten Resultaten —
   nie mehr aus statischen Zahlen.
5. **Reload:** Nach einem Browser-Reload sind erfasste Resultate und Tipps unverändert vorhanden.

## 9. Tests

**Vitest (lib):**

- `withResults`: merged Resultate korrekt, lässt Matches ohne Resultat offen
- `buildLeaderboard(tips, results)`: berechnet alle Spieler aus Tipps × Resultaten; Sortierung;
  Verhalten bei leeren Results
- `loadResults`/`saveResults`: Seed beim Erststart, Fallback bei defektem JSON

**Playwright (e2e):**

- Resultat erfassen auf /resultate → Punkteänderung auf Dashboard und Sperre auf /tipps prüfen
- Resultat zurücksetzen → Spiel wieder editierbar

---

# Ausbaustufe 2: Echtbetrieb — zentrale Daten und automatische Resultate

Status: Entwurf · baut auf Ausbaustufe 1 auf. Ziel: Das Tippspiel ist mit mehreren realen
Mitspielenden auf der Vercel-URL nutzbar; Resultate kommen automatisch aus einem Fussball-Datenfeed.

## 11. Ziel und Abgrenzung zur Ausbaustufe 1

Stufe 1 hält Tipps und Resultate je Browser (localStorage) — jeder sieht nur seinen eigenen Stand.
Stufe 2 ersetzt diese Persistenz durch eine zentrale Datenbank mit Login, ohne UI und Punktelogik
neu zu bauen: `pointsForTip`/`totalPoints` bleiben unverändert, die Seiten beziehen ihre Daten
neu über Server Components/API statt aus dem localStorage.

**In Scope:** zentrale Persistenz, Nutzer-Login, Tipp-Schluss bei Anstoss, automatischer
Resultat-Import, Admin-Override, Fairness-Regeln.
**Out of Scope:** native Apps, Push-Notifications, mehrere parallele Tipprunden/Gruppen.

## 12. Architektur

```
Browser (Next.js Pages, bestehende UI)
   │  Server Components (lesen) + Route Handlers /api (schreiben)
   ▼
Next.js auf Vercel ──── Auth.js v5 (Login)
   │
   ▼
PostgreSQL (Vercel Postgres/Neon; Alternative: Supabase) + Drizzle ORM
   ▲
   │  Upsert Resultate
Vercel Cron (/api/cron/results, alle 15 Min während Turnierphase)
   │
   ▼
football-data.org v4 (Wettbewerb WM 2026) — Alternativen: API-Football, OpenLigaDB
```

Entscheide (Empfehlung, austauschbar):

| Baustein | Wahl | Begründung |
|---|---|---|
| Datenbank | Vercel Postgres (Neon) | nahtlos in Vercel, kostenloser Einstieg; Supabase gleichwertig |
| ORM | Drizzle | leichtgewichtig, TypeScript-first, passt zum strict-Setup |
| Auth | Auth.js v5, E-Mail-Magic-Link | kein Passwort-Handling; Google/GitHub-Login optional |
| Resultat-Feed | football-data.org v4 | WM-Daten im Free Tier, einfache REST-API (`FOOTBALL_DATA_TOKEN`) |
| Import-Trigger | Vercel Cron | kein eigener Scheduler nötig |

## 13. Datenmodell (Postgres, Drizzle-Schema)

```
player    id (uuid, pk) · email (unique) · name · is_admin (bool, default false) · created_at
match     id (pk) · stage · group · kickoff (timestamptz) · home_code · away_code
          · result_home (int, null) · result_away (int, null)
          · result_source ('feed' | 'admin', null) · external_id (Feed-Referenz, unique, null)
tip       player_id (fk) · match_id (fk) · home (int) · away (int) · updated_at
          · pk (player_id, match_id)
```

- Teams bleiben Code-Konstanten (`lib/data.ts`); nur Referenz per `home_code`/`away_code`.
- Punkte werden **nicht** gespeichert, sondern wie bisher berechnet (Single Source of Truth:
  Resultat + Tipp). Bei den Mengen (Dutzende Spieler × 104 Spiele) ist das problemlos.
- Migrationen via `drizzle-kit`; Seed-Script für den Spielplan (einmalig aus dem Feed geladen,
  `external_id` gesetzt).

## 14. Resultat-Import (ersetzt manuelle Erfassung als Regelfall)

1. **Vercel Cron** ruft `/api/cron/results` auf (Schutz: `CRON_SECRET`-Header-Vergleich).
2. Handler holt beendete Spiele des Wettbewerbs vom Feed (`status=FINISHED`), mappt über
   `external_id` und upsertet `result_home/away` mit `result_source='feed'`.
3. K.o.-Spiele: es zählt der Endstand **nach 90 Minuten + Verlängerung inkl. Penaltys gemäss
   Feed-Gesamtresultat**; die Wertungsregel (welcher Stand zählt) wird im Punktesystem-Popup
   ergänzt.
4. **Admin-Override:** Die Seite `/resultate` aus Stufe 1 bleibt — neu nur für `is_admin`
   sichtbar, schreibt mit `result_source='admin'`. Der Cron überschreibt Admin-Einträge nicht.
5. Idempotenz: mehrfacher Import desselben Stands ändert nichts; Korrekturen des Feeds
   (`result_source='feed'`) werden übernommen.

## 15. Fairness- und Spielregeln (neu in Stufe 2)

1. **Tipp-Schluss:** Tipps sind nur **vor Anstoss** (`now < kickoff`) erfass- und änderbar —
   serverseitig erzwungen, nicht nur im UI. (Stufe 1 sperrte erst beim Resultat.)
2. Fremde Tipps sind erst **nach Anstoss** des jeweiligen Spiels einsehbar (optionale
   Detailansicht in der Rangliste).
3. Rangliste: bei Punktgleichheit entscheidet die Anzahl exakter Tipps, danach alphabetisch.
4. Zeitzonen: Anzeige Europe/Zurich (bestehend), Vergleiche in UTC.

## 16. API-Schnitt (Route Handlers)

| Route | Methode | Auth | Zweck |
|---|---|---|---|
| /api/tips | GET/PUT | Login | eigene Tipps lesen/upserten (PUT validiert Tipp-Schluss, Zod) |
| /api/leaderboard | GET | Login | berechnete Rangliste |
| /api/matches | GET | Login | Spielplan inkl. Resultate |
| /api/results | PUT/DELETE | Admin | Override gemäss Stufe 1-Regeln |
| /api/cron/results | POST | CRON_SECRET | Feed-Import (§14) |

Lesepfade bevorzugt direkt in Server Components statt über fetch auf die eigene API.

## 17. Migration von Stufe 1

1. localStorage-Module (`lib/tips.ts`, `lib/results.ts`) hinter ein Interface stellen und durch
   DB-Zugriffe ersetzen; Seiten von `useEffect`-Laden auf Server Components umstellen
   (Tipp-Eingabe bleibt Client Component mit PUT).
2. `DEMO_TIPS`/`DEMO_PLAYER_TIPS`/`OTHER_PLAYERS` entfallen — echte Spieler via Login.
3. Optional: bestehende localStorage-Tipps beim ersten Login einmalig in die DB übernehmen.

## 18. Konfiguration (env.mjs ergänzen)

`DATABASE_URL` · `AUTH_SECRET` (+ Provider-Variablen) · `FOOTBALL_DATA_TOKEN` · `CRON_SECRET`
— alle über `@t3-oss/env-nextjs` mit Zod validiert, in Vercel als Environment Variables gesetzt.

## 19. Akzeptanzkriterien Stufe 2

1. Zwei Nutzer auf zwei Geräten sehen dieselben Resultate und die gemeinsame Rangliste.
2. Ein Tipp nach Anstoss wird serverseitig abgelehnt (422), das UI sperrt das Spiel ab Anstoss.
3. Nach Spielende steht das Resultat ohne manuelles Zutun spätestens nach dem nächsten
   Cron-Lauf in der App; Punkte und Rangliste stimmen.
4. Ein Admin kann ein Feed-Resultat überschreiben; der nächste Cron-Lauf lässt den Override stehen.
5. Nicht eingeloggte Besucher sehen Login, aber keine Tipps anderer.

## 20. Tests Stufe 2

- **Vitest:** Feed-Mapping (Feed-Response → Upsert-Daten, inkl. Penalty-Fall), Tipp-Schluss-Regel,
  Tie-Breaker der Rangliste
- **Integration:** Route Handlers gegen Test-DB (z.B. Neon Branch/pglite) — Tipp-Upsert vor/nach
  Anstoss, Cron-Idempotenz, Admin-Override-Vorrang
- **Playwright:** Login → tippen → (Resultat simulieren) → Punkte in Dashboard/Rangliste

---

# Ausbaustufe 3: Live-Resultate aus externer Quelle

Status: Entwurf · baut auf Ausbaustufe 2 auf. Ziel: Während laufender Spiele zeigt die App
Zwischenstände nahezu in Echtzeit, inklusive provisorischer «Live-Punkte» — die endgültige
Punktevergabe bleibt unverändert beim Endstand (§14).

## 21. Ziel und Abgrenzung

- Stufe 2 importiert nur **beendete** Spiele (Cron, 15-Minuten-Takt). Stufe 3 ergänzt
  **laufende** Spiele: Status, Zwischenstand, Spielminute.
- Live-Daten sind **Anzeige, keine Wertung**: `pointsForTip` läuft zusätzlich über den
  Live-Stand und wird als «provisorisch» markiert; in die Datenbank geschriebene/finale Punkte
  gibt es weiterhin nicht bzw. erst mit `FINISHED`.
- Tipp-Schluss bleibt der Anstoss (§15) — Live-Daten ändern daran nichts.

## 22. Datenquelle und Bezugsweg

- **Feed:** football-data.org v4 liefert Status (`IN_PLAY`, `PAUSED`, `FINISHED`) und
  Zwischenstand; die Spielminute ist im Free Tier nicht zuverlässig → Minute nur anzeigen,
  wenn geliefert, sonst Badge «LIVE». Wenn Minute/niedrigere Latenz wichtig sind:
  API-Football als alternativer Provider (Adapter-Schnittstelle, §23).
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
  sofort in die DB (gleiche Upsert-Logik wie der Cron, §14) — der Cron bleibt als Fallback.

## 23. Modell und Code-Schnitt

```
lib/live/types.ts     LiveScore = { matchId, status: 'LIVE'|'PAUSED', home, away, minute? }
lib/live/provider.ts  Interface LiveProvider { fetchLiveScores(): Promise<LiveScore[]> }
lib/live/football-data.ts   Implementierung football-data.org (Mapping über external_id)
app/api/live/route.ts        Cache + Provider-Aufruf + FINISHED-Upsert
```

- Live-Stände werden **nicht** in `match.result_*` gespeichert (das bleibt dem Endstand
  vorbehalten), sondern nur im Cache gehalten und an die Clients gereicht.
- Provisorische Punkte: bestehendes `pointsForTip(tip, liveScore)` im Client/Server berechnen,
  UI kennzeichnet sie klar (z.B. «+2 P live», gestrichelt/pulsierend).

## 24. UI

- **Dashboard:** Sektion «Jetzt live» vor «Nächste Spiele»: Flaggen, Zwischenstand,
  Badge «LIVE» (pulsierender Punkt, emerald), Minute falls vorhanden, eigener Tipp daneben
  und provisorische Punkte.
- **Tipps-Seite:** laufende Spiele gesperrt (wie beendete), Zwischenstand statt «Endstand»,
  Punkte-Badge als «live» markiert.
- **Rangliste:** optionaler Umschalter «inkl. laufende Spiele» — Standard bleibt die Wertung
  nur aus Endständen, damit die offizielle Reihenfolge stabil ist.
- Polling pausiert bei verstecktem Tab (Page Visibility API) und ausserhalb von Spielzeiten.

## 25. Edge Cases

| Fall | Verhalten |
|---|---|
| Feed nicht erreichbar / Rate Limit | letzter Cache-Stand mit Zeitstempel «Stand 18:42» anzeigen; kein Fehler-Banner beim ersten Fehlversuch |
| Feed meldet FINISHED, Cron noch nicht gelaufen | /api/live upsertet sofort (§22) — kein Zustand «live beendet, aber keine Punkte» |
| Spielabbruch/Verschiebung (Status POSTPONED u.ä.) | Spiel zurück auf «Offen», Hinweis-Badge; Tipps bleiben gesperrt, Admin entscheidet via Override |
| Minute fehlt im Free Tier | nur «LIVE»-Badge ohne Minute |
| Admin-Override während laufendem Spiel | Override betrifft nur Endstand; Live-Anzeige läuft unabhängig weiter |

## 26. Konfiguration

Keine neuen Pflicht-Variablen (`FOOTBALL_DATA_TOKEN` aus Stufe 2 reicht). Optional:
`LIVE_POLL_SECONDS` (Default 60, Client) und `LIVE_CACHE_SECONDS` (Default 30, Server) über
`env.mjs`; bei Providerwechsel zusätzlich `API_FOOTBALL_KEY`.

## 27. Akzeptanzkriterien Stufe 3

1. Während eines laufenden Spiels zeigt das Dashboard innerhalb von ≤ 2 Minuten nach einem Tor
   den neuen Zwischenstand — bei beliebig vielen gleichzeitigen Nutzern mit höchstens einem
   Upstream-Request pro Cache-Intervall.
2. Provisorische Live-Punkte sind sichtbar als solche gekennzeichnet und verschwinden bzw.
   werden final, sobald das Spiel beendet ist.
3. Die Standard-Rangliste ändert sich durch Live-Stände nicht; der Live-Umschalter zeigt die
   Projektion.
4. Bei Feed-Ausfall bleibt die App nutzbar und zeigt den letzten Stand mit Zeitstempel.
5. Ausserhalb von Spielzeiten erzeugt die App keine Upstream-Requests.

## 28. Tests Stufe 3

- **Vitest:** Provider-Mapping (IN_PLAY/PAUSED/FINISHED, fehlende Minute), Cache-Logik
  (ein Upstream-Call pro Intervall), «keine Spiele live → kein Upstream»
- **Integration:** /api/live mit gemocktem Provider — FINISHED-Upsert, Rate-Limit-/Fehlerpfad
- **Playwright:** Live-Spiel simulieren (Provider-Mock) → «Jetzt live»-Sektion, gesperrter Tipp,
  provisorische Punkte, Umschalter in der Rangliste
