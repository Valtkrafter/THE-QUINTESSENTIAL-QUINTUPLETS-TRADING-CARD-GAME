# Booster, Geld und Preise (Deutsch)

Stand: 11. Oktober 2026. Stufe 3 ist gebaut, diese Zahlen laufen so im Spiel. Alles steht als Daten in `playground/src/data/packs.json`, die Zahlen lassen sich also ohne Programmieren ändern. Die Wörter richten sich nach `wortschatz.md` (Booster, Schimmer, Spuknacht, die sieben Seltenheiten).

## 1. Was du entschieden hast ✅
- **5 Karten pro Booster.**
- **Es soll ein echter Grind sein.** Gute Karten bekommt man nur mit viel Spielen. Wir haben die Stufe "Hart" gewählt.
- **Nie stuck.** Es gibt immer einen Weg, an Geld zu kommen.
- **Halloween** läuft ab sofort bis zum 4. November (nicht erst ab dem 15.), **ohne Gratis-Booster**, mit einer eigenen **Spuknacht** wie ein Banner bei Genshin oder WuWa: Hauptkarten, 50/50, Garantie.
- **Kampf direkt nach den Boostern.** Er ist die Haupt-Geldquelle.
- **Animation:** richtig stark, nach dem Vorbild der Gacha-Animation von Wuthering Waves, mit Ton. Der Ton wird im Browser erzeugt (Tone.js).

## 2. Der normale Booster: TQQ01-Booster
**¥500 für 5 Karten.**

| Platz | Was darin liegen kann |
|---|---|
| 1 bis 3 | Alltag 60 % · Besonders 40 % |
| 4 (Plus) | Besonders 40 % · Selten 44 % · Superselten 12 % · Kunstwerk 4 % |
| 5 (Treffer) | Selten 44 % · Superselten 28 % · Kunstwerk 14 % · Meisterwerk 10 % · Legende 4 % |

Pro Booster im Schnitt (nachgerechnet mit 100.000 Boostern): 1,8 Alltag · 1,6 Besonders · 0,88 Selten · 0,40 Superselten · 0,18 Kunstwerk · 0,10 Meisterwerk · 0,042 Legende.
63 % der Booster haben mindestens eine Superselten oder besser, 14 % ein Meisterwerk oder eine Legende, 4 % eine Legende.
Etwa 65 % der Booster haben mindestens eine Karte mit Sonderschimmer, etwa 15 % eine mit Premium-Schimmer (Kosmos, Goldrausch, Prisma-Kristall, Strahlenkranz).

**Garantien:**
- Nach 29 Boostern ohne Meisterwerk oder Legende bringt der 30. Booster eine davon (75 % Meisterwerk, 25 % Legende).
- Nach 89 Boostern ohne Legende bringt der 90. Booster sicher eine.
- **Dublettenschutz:** Eine garantierte Karte ist immer ein Motiv, das du noch nicht hast (solange es noch eines gibt).
- Die Garantien lösen selten aus (Meisterwerk in 0,17 % der Booster, Legende in 0,09 %): sie sind das Sicherheitsnetz, nicht der Normalfall.

## 3. Wie lange dauert das Sammeln?
Simulation mit 400 Spielern, Mitte der Spieler und "9 von 10 Spielern sind spätestens hier fertig". Bei 3 Boostern pro Tag (etwa 30 Minuten Spielen) in Klammern.

| Ziel | Mitte | 9 von 10 spätestens |
|---|---|---|
| Erstes Meisterwerk | 7 Booster (2 Tage) | 23 Booster |
| Erste Legende | 17 Booster (6 Tage) | 52 Booster |
| Alle Karten von Alltag bis Superselten (44 Motive) | 56 Booster (19 Tage) | 85 Booster |
| Alle Kunstwerke (9) | 131 Booster | 221 Booster |
| Alle Meisterwerke (6) | 127 Booster | 234 Booster |
| Alle Legenden (5) | 233 Booster | 397 Booster |
| **Das ganze Set (69 Motive)** | **243 Booster (81 Tage)** | **400 Booster (133 Tage)** |

Schlimmster Fall durch die Garantien: höchstens 5 × 90 = 450 Booster allein für die Legenden, also nie unbegrenzt.

## 4. Halloween-Spuknacht
**¥500 pro Booster, 10. Oktober bis 4. November 2026.** Es gibt keine Gratis-Booster.

- **Aufbau:** Karte 1 bis 4 wie im normalen Booster. Auf Platz 4 (Plus) kann statt der normalen Karte eine der 10 Halloween-Karten stehen. Platz 5 (Treffer) ist wie normal, mit den normalen Garantien.
- **Chance auf eine Spuknacht-Karte:** 1,6 % pro Booster. Nach 44 Boostern ohne Spuknacht-Karte steigt die Chance mit jedem Booster um 7 Prozentpunkte. Im 70. Booster ist eine Spuknacht-Karte sicher.
- **Hauptkarten und 50/50:** Pro Phase gibt es 2 Hauptkarten. Eine Spuknacht-Karte ist zu 50 % eine Hauptkarte, sonst eine der anderen 8 Halloween-Karten. Verlierst du das 50/50, ist die nächste Spuknacht-Karte sicher eine Hauptkarte.
- **Phasen:** Phase 1 (10. bis 22. Oktober): Nino Süßes (Naschzeug) und Miku Saures (Spukmelodie). Phase 2 (23. Oktober bis 4. November): Ichika Süßes (Kostümwechsel) und Itsuki Saures (Hungriger Geist). Garantie und 50/50-Stand bleiben beim Phasenwechsel erhalten. Yotsuba hat diesmal keine Hauptkarte; das lässt sich in den Daten ändern.
- **Dublettenschutz** gilt auch hier: die Spuknacht-Karte ist wenn möglich eine, die du noch nicht hast.
- **Was das heißt:** Eine Spuknacht-Karte kostet im Schnitt etwa 34 Booster (¥17.000). Wer 25 Tage lang 3 Booster pro Tag öffnet (75 Booster), hat im Schnitt 1,8 Spuknacht-Karten und 1,1 Hauptkarten. 80 % haben mindestens eine Hauptkarte. Alle 10 Karten schafft niemand in einem Event: sie kommen im nächsten Jahr wieder.
- Halloween-Karten stecken weder in normalen Boostern noch im Kiosk.
- Eine Spuknacht-Karte (Meisterwerk) setzt auch die Meisterwerk-Garantie zurück.

## 5. Geld (Yen)
| | |
|---|---|
| Startgeld | ¥1.500 (3 Booster) |
| Tagesbonus | ¥400 pro Tag. Verpasste Tage sammeln sich bis zu 3 Tage an. Wird heute schon abgeholt über die Booster-Seite |
| Kämpfe (Stufe 4) | Sieg ¥150 / ¥250 / ¥400 (Leicht / Normal / Schwer), Niederlage ¥50, erster Sieg des Tages +¥200. Das ist die Haupt-Geldquelle |
| Dubletten verkaufen (Stufe 5) | siehe Abschnitt 8 |
| Kartendex-Belohnungen (Stufe 5) | alle 10 neuen Motive 1 Gratis-Booster, ¥2.000 für jede komplette Figur |

Ziel: Wer täglich etwa 30 Minuten spielt, bekommt ungefähr ¥1.500 am Tag, also 3 Booster. Die genauen Kampf-Belohnungen werden in Stufe 4 mit einer Simulation geprüft und gegebenenfalls angepasst.

## 6. Nie stuck
- **Starter-Deck** (Stufe 4): Jeder neue Spielstand bekommt ein spielbares 30er-Deck. Du kannst also immer kämpfen und Geld verdienen, auch ohne einen einzigen Booster.
- **Jeder Kampf zahlt etwas,** auch eine Niederlage.
- **Der Tagesbonus kommt immer.**
- **Verkauft wird nur, was übrig ist:** nie die letzte Kopie eines Motivs, nie Karten aus dem Deck, nie eine versiegelte Karte.
- **Das Geld kann nie unter null fallen.**
- **Die Garantien begrenzen das Pech nach oben** (Abschnitt 3).

## 7. Der Ablauf beim Öffnen (so ist es gebaut)
1. **Booster-Bildschirm:** zwei Booster (die Spuknacht oben, wenn sie läuft), Preis, Garantie-Balken, "1 Booster" oder "5 Booster" öffnen, Quoten-Seite, die letzten Booster, Tagesbonus.
2. **Das Ergebnis steht sofort fest und ist gespeichert,** noch bevor die Animation beginnt. Überspringen, Abbrechen oder Fenster schließen ändert nichts.
3. **Die Show:**
   - **Sturm:** Die Kamera fällt aus großer Höhe in ein Sturmauge (Vorbild: die Gacha-Animation von Wuthering Waves, aber komplett selbst gebaut).
   - **Nadel und Tor:** Im schwarzen Raum fliegt eine **Lichtnadel** mit langem Schweif von unten links in ein **Tor**, ein dunkles Loch in einem Ring aus wirbelnden Wolken. Dazu kommen Geschwindigkeitslinien und dünne Umlaufbahnen. Die **Farbe** verrät die beste Karte im Booster: blau (Alltag bis Selten), violett (Superselten), rosa (Kunstwerk), gold (Meisterwerk), Regenbogen (Legende). Bei besseren Boostern wechselt sie unterwegs die Farbe nach oben (blau, violett, gold). Zum Schluss stürzt die Nadel ins Tor, das Bild verwischt zur Mitte hin, dann kommt der **Weißblitz** mit Kreuzstern und Lichtadern.
   - Bei **Meisterwerk** und **Legende** weben sich zusätzlich **fünf Lichtfäden** in den Herz-Farben der Schwestern um die Nadel. Sie hängt kurz vor dem Tor, die Fäden ziehen sich zu, dann stürzt sie hinein.
   - **Aufschlag:** Blitz, Druckwellen, Lichtstrahlen und ein Funkenregen. Je besser die Karte, desto größer.
   - **Zeremonie** (ab Kunstwerk, nur in der ausführlichen Version): Der Bildschirm wird schwarz, eine dünne Linie wird gezogen, ein gezackter Ausschlag schießt in der Mitte hoch, und **Sterne leuchten nacheinander auf**: drei bei Kunstwerk, vier bei Meisterwerk, fünf bei Legende (in den fünf Herz-Farben). Danach kommen die Karten.
   - **Aufdecken:** Die Karten kommen verdeckt herein, die schlechteren zuerst und die beste zuletzt. Hinter der Karte drehen sich Lichtstrahlen in der Farbe der Seltenheit. Bei Meisterwerk und Legende hält die Karte auf der Kante an, der Hintergrund wird dunkel und die Kamera fährt heran, dann dreht sie sich mit ihrem echten 3D-Schimmer auf.
   - **Namensschild:** Seltenheit, Name, Titel, "NEU" oder "Dublette", Schimmer und ob es eine Garantie oder Hauptkarte war.
   - **Ergebnis:** alle Karten, was neu ist und dein Kartendex-Stand.
   - Tippen, Leertaste oder Pfeil rechts geht weiter, Escape oder "Überspringen" springt zum Ergebnis.
4. **Einstellungen:** Booster-Animation Ausführlich, Kurz oder Aus. Lautstärke und Ton aus. Bei "Verringerte Bewegung" im Betriebssystem läuft automatisch die kurze Version.
5. **Ton (Tone.js):** Wind und tiefes Dröhnen beim Sturm, Aufstieg beim Flug, Herzschlag, Aufschlag mit tiefem Schlag und Rauschen, bei der Zeremonie eine Glocke pro Stern (jede höher als die davor), Glockenklänge die mit der Seltenheit wachsen, Funkeln bei neuen Karten.

## 8. Später (Entwurf, ich frage dann nochmal)
**Kiosk (Stufe 5):** Damit gute Karten ein Grind bleiben, verkauft der Kiosk nur bis **Superselten**, immer mit schlichtem Schimmer (ohne Folie). Kunstwerke, Meisterwerke, Legenden und die Halloween-Karten gibt es nur aus Boostern. Täglich wechselnde Angebote.

| Seltenheit | Kiosk-Preis |
|---|---|
| Alltag | ¥30 |
| Besonders | ¥80 |
| Selten | ¥250 |
| Superselten | ¥800 |

**Verkaufen (Stufe 5):** Nur Dubletten. Alltag ¥3, Besonders ¥8, Selten ¥25, Superselten ¥70, Kunstwerk ¥120, Meisterwerk ¥250, Legende ¥600. Der Schimmer multipliziert: Folie ×1,6, Premium ×3. Das sind etwa 35 bis 40 % des Boosterpreises, wenn man einen ganzen Booster verkauft.

**Siegel (Stufe 6, früher "Bewertung"):** Du lässt eine Karte versiegeln. Keine Wartezeit, nur eine kleine Zeremonie beim Aufdecken. Gebühr ¥200 (Alltag bis Selten), ¥500 (Superselten und Kunstwerk), ¥1.000 (Meisterwerk und Legende). Die Note ist der Durchschnitt der vier versteckten Teilnoten und verändert den Wert: 10 ×6, 9,5 ×4, 9 ×2,5, 8,5 ×1,8, 8 ×1,4, 7 ×1,1, 6,5 oder weniger ×0,8. Etwa jede zweite Karte ist eine 9 oder besser, etwa jede achte eine 9,5 oder besser, und eine 10 kommt nur bei etwa 1 von 60 Karten vor. Die Karte steckt danach in einer Siegelkapsel mit ihrer Note.

## 9. Technik
- `src/data/packs.json`: Preise, Plätze, Garantien, Spuknacht. Eine Prüfung stoppt das Spiel mit einer klaren Meldung, wenn etwas nicht stimmt (Tabellen, Phasen, Hauptkarten).
- `src/packs/rollPack.ts`: die Würfe. `src/packs/openPack.ts`: bezahlt, würfelt, legt die Karten ab, zählt die Garantien, in einem Schritt.
- Spielstand Version 3: Garantie-Zähler, Tagesbonus, Booster-Verlauf.
- Tests: Quoten gegen die Tabellen (Monte Carlo), Garantien, Dublettenschutz, Spuknacht-Fenster, 50/50, Wiederholbarkeit. Ein **Simulator** in den Einstellungen (Entwicklungsversion) öffnet viele Booster und zeigt die Zahlen aus Abschnitt 3 und 4.
- Show: `src/scene/pull/` (Ablauf als reiner Code, Lichteffekte, Shader, Bloom nur für den Hintergrund) und `src/ui/pull/` (Oberfläche). Ton: `src/audio/`.
