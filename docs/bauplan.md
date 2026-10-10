# TQQ TCG: Bauplan (Deutsch)

Stand: Oktober 2026. Das ist der Plan zum Bauen. Entscheidungen, die schon feststehen, sind mit ✅ markiert. Alles andere ist ein Vorschlag, den du bestätigst, bevor ich es baue.

## 1. Was schon feststeht ✅
- Kostenlos für immer, kein echtes Geld. Offline und Einzelspieler zuerst, Mehrspieler vielleicht später.
- Zuerst im Browser, danach als Desktop-App (Tauri).
- Ruhiges, schönes Design um die Karten herum (nicht der dunkle Arcade-Look).
- 79 Karten im ersten Set: 5 Schwestern × 12 (10 Stufen + 2 Halloween) + Fūtarō 6, Raiha 4, Isanari 3, Maruo 3, Yusuke 3.
- Battle-System: 30er-Deck, aktiver Charakter + Bank (max. 3), 1 Gratis-Herz pro Zug, 1 Unterstützer pro Zug, Schwäche ×2, Resistenz −30, Sieg bei 6 Erinnerungen, Prime gibt 2.
- Halloween-Karten: begrenzt (Event-Banner), eigene Funktion, mehr Power, 2 Erinnerungen beim K.O., nur 1× pro Deck.
- Strenge TypeScript-Regeln ohne `any`, Spiellogik als reine Funktionen mit festem Zufall (Seed), jede Regel mit Test.

## 2. Technik-Vorschlag (bitte bestätigen)
| Thema | Vorschlag | Warum |
|---|---|---|
| Ordner | `playground/` zum echten Projekt ausbauen, `git init` im Hauptordner | nichts verschieben, Docs werden mitversioniert |
| Zustand | Zustand | klein, einfach, gut testbar |
| Datenprüfung | Zod | Kartendaten und Speicherstände werden beim Laden geprüft |
| Battle-Logik | reiner Reducer `(Zustand, Aktion) → neuer Zustand` | testbar, KI-Simulationen, später auch Mehrspieler |
| Ablauf in der UI | normale React-Zustände; XState nur wenn nötig | weniger Komplexität am Anfang |
| Speichern | IndexedDB (idb-keyval) + Export/Import als Datei | geht im Browser und in Tauri |
| Navigation | wouter | winzig, reicht für ~8 Bildschirme |
| Styling | CSS Modules + CSS-Variablen (Design-Tokens) | kein Framework, volle Kontrolle für den ruhigen Look |
| Tests | Vitest jetzt, Playwright später | schnell, passt zu Vite |
| Zufall | eigener kleiner Seed-Zufall | Pulls und Kämpfe sind wiederholbar |

## 3. Ordnerstruktur (Schichten)
`src/domain` (Regeln, Packs, Bewertung, Wirtschaft, Battle, kein React) → `src/data` (Karten als Daten, Zod) → `src/state` (Speicher, Einstellungen) → `src/render` (Karten-Gesicht und Holo, schon vorhanden) → `src/ui` (Bildschirme). Obere Schichten dürfen untere benutzen, nie umgekehrt.

## 4. Stufen
Größen: S = wenige Sitzungen, M = eine Woche, L = mehrere Wochen, XL = großes Projekt. Jede Stufe endet spielbar, mit grünen Tests und Build.

| Stufe | Ziel | Inhalt | Größe |
|---|---|---|---|
| 0 Fundament | Aus dem Playground wird ein Projekt | git, Skripte (typecheck, lint, test, build), Vitest, Ordnerstruktur, Bild-Import (Resize + Manifest, Bilder bleiben lokal und aus git), `docs/card-system.md` aktualisieren | S |
| 1 Daten & Speicher | Verlässliche Basis | Kartenschema + 79 Karten als Datendateien, Stufen-Zuordnung, Effekt-Vokabular, Besitz-Modell (Finish, versteckte Zustandswerte, Seriennummer), Seed-Zufall, Speicherstand mit Versionen | M |
| 2 Sammelmappe & Ansicht | Du siehst, was du besitzt | App-Rahmen, ruhiges Theme, Sammelmappe (Vorschaubilder, keine 1000 WebGL-Fenster), Filter, Card-Dex x/79, Ansicht mit 3D-Holo, Vitrine | M |
| 3 Packs | Der große Moment | Pack-Quoten (öffentlich), Finish-Würfe, Pity-Zähler, Reveal-Animation, Überspringen, Halloween-Event-Banner mit Datum, Quoten-Simulator | M |
| 4 Wirtschaft & Shop | Grund weiterzuspielen | Yen-Quellen und -Ausgaben, Tagesbonus, Einzelkarten-Kiosk, Massenverkauf, Preisformel, Balance-Simulator | M |
| 5 Bewertung | Sammler-Belohnung | versteckte Teilnoten, sichtbare Abnutzung im Shader, Einsenden und Aufdecken, 3D-Slab, Bestandsbericht | L |
| 6 Deck & Battle-System | Der Spielteil | 6a Regel-Engine mit Tests, 6b Deckbau + Legalitäts-Prüfung, 6c Kampf-Bildschirm (wie die Animation), 6d Computer-Gegner (Leicht/Normal/Schwer) + Belohnungen, Balance per KI-gegen-KI-Simulation (Ziel ~10 Minuten) | XL |
| 7 Politur & Release | Es wird eine App | Tauri (Windows), Qualitätsstufen für schwache Grafik (Intel UHD), Ton, Deutsch/Englisch/Japanisch, Bedienhilfen, Playwright-Tests, Mehrspieler-Vorbereitung | L |

Reihenfolge: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Nach Stufe 3 kannst du schon Packs öffnen und deine Karten ansehen.

## 5. Wie wir arbeiten
- Nach jeder Stufe zeige ich dir das Ergebnis im Browser und fasse es auf Deutsch zusammen.
- Bei Design-, Regel- und Bibliotheks-Entscheidungen frage ich zuerst. Ich nehme nichts an.
- Pro Stufe ein Git-Commit-Abschnitt, damit du immer zurück kannst.

## 6. Risiken
| Risiko | Umgang |
|---|---|
| Bilder sind fremdes Fan-Art | bleiben lokal und aus git; vor einer öffentlichen Veröffentlichung ersetzen oder Rechte klären |
| Schwache Grafik | früh auf der Intel-UHD testen, Qualitätsstufen, Vorschaubilder statt WebGL im Raster |
| Battle zu groß | kleines Effekt-Vokabular, Computer-Gegner mit festen Decks, kein PvP in Version 1 |
| Wirtschaft aus dem Gleichgewicht | alle Zahlen in einer Tabelle, Simulator vor dem Release |
| Halloween-Event offline | Datum kommt aus der Systemuhr, Events als Daten, Wiederholung später möglich |
