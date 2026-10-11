# Packs, Geld und Preise (Deutsch)

Stand: 10. Oktober 2026. Stufe 3 ist gebaut, diese Zahlen laufen so im Spiel. Alles steht als Daten in `playground/src/data/packs.json`, die Zahlen lassen sich also ohne Programmieren ändern.

## 1. Was du entschieden hast ✅
- **5 Karten pro Pack.**
- **Es soll ein echter Grind sein.** Gute Karten bekommt man nur mit viel Spielen. Wir haben die Stufe "Hart" gewählt.
- **Nie stuck.** Es gibt immer einen Weg, an Geld zu kommen.
- **Halloween** läuft ab sofort bis zum 4. November (nicht erst ab dem 15.), **ohne Gratis-Packs**, mit einem eigenen **Banner** wie bei Genshin oder WuWa: Hauptkarten, 50/50, Garantie.
- **Kampf direkt nach den Packs.** Er ist die Haupt-Geldquelle.
- **Animation:** richtig stark, Sternschnuppe und fünf Lichtfäden kombiniert, mit Ton. Der Ton wird im Browser erzeugt (Tone.js).

## 2. Das normale Pack: TQQ01 Booster
**¥500 für 5 Karten.**

| Slot | Was darin liegen kann |
|---|---|
| 1 bis 3 | Common 60 % · Uncommon 40 % |
| 4 (Plus) | Uncommon 40 % · Rare 44 % · Double Rare 12 % · Art Rare 4 % |
| 5 (Treffer) | Rare 44 % · Double Rare 28 % · Art Rare 14 % · Special Art Rare 10 % · Ultra Rare 4 % |

Pro Pack im Schnitt (nachgerechnet mit 100.000 Packs): 1,8 Common · 1,6 Uncommon · 0,88 Rare · 0,40 Double Rare · 0,18 Art Rare · 0,10 Special Art Rare · 0,042 Ultra Rare.
63 % der Packs haben mindestens eine Double Rare oder besser, 14 % eine Special Art Rare oder Ultra Rare, 4 % eine Ultra Rare.
Etwa 65 % der Packs haben mindestens eine Karte mit Sonderfinish, etwa 15 % eine mit Premium-Finish (Cosmos, Gold Foil, Prism Crystal, Radiant).

**Garantien (Pity):**
- Nach 29 Packs ohne Special Art Rare oder Ultra Rare ist das 30. Pack garantiert eine (75 % Special Art Rare, 25 % Ultra Rare).
- Nach 89 Packs ohne Ultra Rare ist das 90. Pack garantiert eine.
- **Dublettenschutz:** Eine garantierte Karte ist immer ein Motiv, das du noch nicht hast (solange es noch eines gibt).
- Die Garantien lösen selten aus (Special Art Rare in 0,17 % der Packs, Ultra Rare in 0,09 %): sie sind das Sicherheitsnetz, nicht der Normalfall.

## 3. Wie lange dauert das Sammeln?
Simulation mit 400 Spielern, Mitte der Spieler und "9 von 10 Spielern sind spätestens hier fertig". Bei 3 Packs pro Tag (etwa 30 Minuten Spielen) in Klammern.

| Ziel | Mitte | 9 von 10 spätestens |
|---|---|---|
| Erste Special Art Rare | 7 Packs (2 Tage) | 23 Packs |
| Erste Ultra Rare | 17 Packs (6 Tage) | 52 Packs |
| Alle Common bis Double Rare (44 Motive) | 56 Packs (19 Tage) | 85 Packs |
| Alle Art Rare (9) | 131 Packs | 221 Packs |
| Alle Special Art Rare (6) | 127 Packs | 234 Packs |
| Alle Ultra Rare (5) | 233 Packs | 397 Packs |
| **Das ganze Set (69 Motive)** | **243 Packs (81 Tage)** | **400 Packs (133 Tage)** |

Schlimmster Fall durch die Garantien: höchstens 5 × 90 = 450 Packs allein für die Ultra Rare, also nie unbegrenzt.

## 4. Halloween Wish (Banner)
**¥500 pro Pack, 10. Oktober bis 4. November 2026.** Es gibt keine Gratis-Packs.

- **Aufbau:** Karte 1 bis 4 wie im normalen Pack. In Slot 4 (Plus) kann statt der normalen Karte eine der 10 Halloween-Karten stehen. Slot 5 (Treffer) ist wie normal, mit den normalen Garantien.
- **Chance auf eine Banner-Karte:** 1,6 % pro Pack. Nach 44 Packs ohne Banner-Karte steigt die Chance mit jedem Pack um 7 Prozentpunkte. Im 70. Pack ist eine Banner-Karte sicher.
- **Hauptkarten und 50/50:** Pro Phase gibt es 2 Hauptkarten. Eine Banner-Karte ist zu 50 % eine Hauptkarte, sonst eine der anderen 8 Halloween-Karten. Verlierst du das 50/50, ist die nächste Banner-Karte sicher eine Hauptkarte.
- **Phasen:** Phase 1 (10. bis 22. Oktober): Nino Treat (Sweet Treats) und Miku Trick (Haunting Melody). Phase 2 (23. Oktober bis 4. November): Ichika Treat (Costume Change) und Itsuki Trick (Starving Ghost). Garantie und 50/50-Stand bleiben beim Phasenwechsel erhalten. Yotsuba hat diesmal keine Hauptkarte; das lässt sich in den Daten ändern.
- **Dublettenschutz** gilt auch hier: die Banner-Karte ist wenn möglich eine, die du noch nicht hast.
- **Was das heißt:** Eine Banner-Karte kostet im Schnitt etwa 34 Packs (¥17.000). Wer 25 Tage lang 3 Packs pro Tag öffnet (75 Packs), hat im Schnitt 1,8 Banner-Karten und 1,1 Hauptkarten. 80 % haben mindestens eine Hauptkarte. Alle 10 Karten schafft niemand in einem Event: sie kommen im nächsten Jahr wieder.
- Halloween-Karten stecken weder in normalen Packs noch im Kiosk.
- Eine Banner-Karte (Special Art Rare) setzt auch die Special-Art-Rare-Garantie zurück.

## 5. Geld (Yen)
| | |
|---|---|
| Startgeld | ¥1.500 (3 Packs) |
| Tagesbonus | ¥400 pro Tag. Verpasste Tage sammeln sich bis zu 3 Tage an. Wird heute schon abgeholt über die Packs-Seite |
| Kämpfe (Stufe 4) | Sieg ¥150 / ¥250 / ¥400 (Leicht / Normal / Schwer), Niederlage ¥50, erster Sieg des Tages +¥200. Das ist die Haupt-Geldquelle |
| Dubletten verkaufen (Stufe 5) | siehe Abschnitt 8 (gebaut) |
| Dex-Belohnungen (Stufe 5) | alle 10 neuen Motive 1 Gratis-Pack, ¥2.000 für jede komplette Figur (gebaut) |

Ziel: Wer täglich etwa 30 Minuten spielt, bekommt ungefähr ¥1.500 am Tag, also 3 Packs. Die genauen Kampf-Belohnungen werden in Stufe 4 mit einer Simulation geprüft und gegebenenfalls angepasst.

## 6. Nie stuck
- **Starter-Deck** (Stufe 4): Jeder neue Spielstand bekommt ein spielbares 30er-Deck. Du kannst also immer kämpfen und Geld verdienen, auch ohne ein einziges Pack.
- **Jeder Kampf zahlt etwas,** auch eine Niederlage.
- **Der Tagesbonus kommt immer.**
- **Verkauft wird nur, was übrig ist:** nie die letzte Kopie eines Motivs, nie Karten aus dem Deck, nie eine bewertete Karte.
- **Das Geld kann nie unter null fallen.**
- **Die Garantien begrenzen das Pech nach oben** (Abschnitt 3).

## 7. Der Ablauf beim Öffnen (so ist es gebaut)
1. **Packs-Bildschirm:** zwei Packs (Banner oben, wenn er läuft), Preis, Garantie-Balken, "1 Pack" oder "5 Packs" öffnen, Quoten-Seite, die letzten Packs, Tagesbonus.
2. **Das Ergebnis steht sofort fest und ist gespeichert,** noch bevor die Animation beginnt. Überspringen, Abbrechen oder Fenster schließen ändert nichts.
3. **Die Show:**
   - **Sturm:** Die Kamera fällt aus großer Höhe in ein Sturmauge (Vorbild: die Gacha-Animation von Wuthering Waves, aber komplett selbst gebaut).
   - **Nadel und Tor:** Im schwarzen Raum fliegt eine **Lichtnadel** mit langem Schweif von unten links in ein **Tor**, ein dunkles Loch in einem Ring aus wirbelnden Wolken. Dazu kommen Geschwindigkeitslinien und dünne Umlaufbahnen. Die **Farbe** verrät die beste Karte im Pack: blau (Common bis Rare), violett (Double Rare), rosa (Art Rare), gold (Special Art Rare), Regenbogen (Ultra Rare). Bei besseren Packs wechselt sie unterwegs die Farbe nach oben (blau, violett, gold). Zum Schluss stürzt die Nadel ins Tor, das Bild verwischt zur Mitte hin, dann kommt der **Weißblitz** mit Kreuzstern und Lichtadern.
   - Bei **Special Art Rare** und **Ultra Rare** weben sich zusätzlich **fünf Lichtfäden** in den Herz-Farben der Schwestern um die Nadel. Sie hängt kurz vor dem Tor, die Fäden ziehen sich zu, dann stürzt sie hinein.
   - **Aufschlag:** Blitz, Druckwellen, Lichtstrahlen und ein Funkenregen. Je besser die Karte, desto größer.
   - **Zeremonie** (ab Art Rare, nur in der ausführlichen Version): Der Bildschirm wird schwarz, eine dünne Linie wird gezogen, ein gezackter Ausschlag schießt in der Mitte hoch, und **Sterne leuchten nacheinander auf**: drei bei Art Rare, vier bei Special Art Rare, fünf bei Ultra Rare (in den fünf Herz-Farben). Danach kommen die Karten.
   - **Aufdecken:** Die Karten kommen verdeckt herein, die schlechteren zuerst und die beste zuletzt. Hinter der Karte drehen sich Lichtstrahlen in der Farbe der Seltenheit. Bei Special Art Rare und Ultra Rare hält die Karte auf der Kante an, der Hintergrund wird dunkel und die Kamera fährt heran, dann dreht sie sich mit ihrem echten 3D-Finish auf.
   - **Namensschild:** Seltenheit, Name, Titel, "NEU" oder "Dublette", Finish und ob es eine Garantie oder Hauptkarte war.
   - **Ergebnis:** alle Karten, was neu ist und dein Card-Dex-Stand.
   - Tippen, Leertaste oder Pfeil rechts geht weiter, Escape oder "Überspringen" springt zum Ergebnis.
4. **Einstellungen:** Pack-Animation Ausführlich, Kurz oder Aus. Lautstärke und Ton aus. Bei "Verringerte Bewegung" im Betriebssystem läuft automatisch die kurze Version.
5. **Ton (Tone.js):** Wind und tiefes Dröhnen beim Sturm, Aufstieg beim Flug, Herzschlag, Aufschlag mit tiefem Schlag und Rauschen, bei der Zeremonie eine Glocke pro Stern (jede höher als die davor), Glockenklänge die mit der Seltenheit wachsen, Funkeln bei neuen Karten.

## 8. Kiosk, Verkaufen und Dex-Belohnungen (Stufe 5, gebaut)
**Kiosk** (Menü "Shop"): Damit gute Karten ein Grind bleiben, verkauft der Kiosk nur bis **Double Rare**, immer mit normalem Finish. Art Rare, Special Art Rare, Ultra Rare und die Halloween-Karten gibt es nur aus Packs. Jeden Tag liegen **8 Karten** im Regal (3 Common, 2 Uncommon, 2 Rare, 1 Double Rare), für den ganzen Tag dieselben, am nächsten Tag andere. Jedes Angebot kann pro Tag **2-mal** gekauft werden.

| Seltenheit | Kiosk-Preis |
|---|---|
| Common | ¥30 |
| Uncommon | ¥80 |
| Rare | ¥250 |
| Double Rare | ¥800 |

**Verkaufen** (Shop, Reiter "Sell spare cards"): Nur **Dubletten**. Common ¥3, Uncommon ¥8, Rare ¥25, Double Rare ¥70, Art Rare ¥120, Special Art Rare ¥250, Ultra Rare ¥600. Finish multipliziert: Foil (Rainbow Holo, Sparkle) ×1,6, Premium (Cosmos, Gold Foil, Prism Crystal, Radiant) ×3. Ein typisches Pack bringt verkauft unter ¥100 (ein Fünftel des Preises); nur die besten Packs mit Premium-Karten bringen mehr als sie kosten. Behalten wird immer: **eine Kopie jedes Motivs** (die mit dem schönsten Finish und dem besten Zustand), **so viele Kopien, wie dein größtes Deck braucht**, jede Kopie in der **Vitrine** und jede **bewertete** Karte. Der Rest kann verkauft werden, nach Bestätigung.

**Dex-Belohnungen** (Seite "Card Dex"): alle **10 neuen Motive 1 Gratis-Pack** (normales Pack, nicht das Banner), **¥2.000** für jede Figur, von der du alle Motive hast. Jede Belohnung gibt es nur einmal. Die Gratis-Packs werden auf der Packs-Seite geöffnet, mit der vollen Animation.

## 9. Bewertung ("Grading", Stufe 6, gebaut)
Jede Kopie hat von Anfang an **vier versteckte Teilnoten** von 1 bis 10: **Centering** (sitzt der Druck in der Mitte?), **Corners** (Ecken), **Edges** (Kanten) und **Surface** (Oberfläche). Das Spiel würfelt sie beim Drucken der Karte, die meisten verlieren etwa einen Punkt, wenige viel, manche nichts.

**Man sieht sie schon vorher.** In der 3D-Ansicht zeigt der Shader die Abnutzung: ein schiefer Druck (weißer Streifen an einer Seite), weiße Ecken und Kanten, Kratzer, die aufblitzen, wenn das Licht darüber streicht, und ein matter Schleier. Wer genau hinschaut, schickt die guten Karten ein.

**Einsenden** (Menü "Grading", oder "Grade it" in der Kartenansicht): keine Wartezeit, nur eine kleine Zeremonie. Vorher zeigt das Spiel die **Gebühr** und eine **Preisleiter** (was die Karte bei jeder Note wert ist, daneben der Wert als lose Karte), damit niemand blind bezahlt. Die Gebühr wird immer bezahlt, auch bei einer schlechten Note. Das Ergebnis wird **zuerst gespeichert**, dann kommt die Zeremonie: Die vier Teilnoten erscheinen nacheinander (mit einem Glockenton), dann wird die Gesamtnote gestempelt. Eine 10 bekommt goldene Strahlen und Funken, eine 9,5 Funken. Die Zeremonie lässt sich jederzeit überspringen.

| Seltenheit | Gebühr |
|---|---|
| Common, Uncommon, Rare | ¥200 |
| Double Rare, Art Rare | ¥500 |
| Special Art Rare, Ultra Rare | ¥1.000 |

**Die Note** ist der Durchschnitt der vier Teilnoten, abgerundet auf halbe Punkte; ab 9,75 ist es eine 10. Die Karte kommt im **Slab** zurück (durchsichtige Hülle mit Etikett oben: Note, Wort, die vier Teilnoten, Datum) und sieht in der 3D-Ansicht auch so aus. Die Wörter: 10 Pristine, 9,5 Gem Mint, 9 Mint, 8 bis 8,5 Near Mint, 7 bis 7,5 Excellent, 5 bis 6,5 Good, darunter Played.

**Der Wert** ist der Preis der Karte (Seltenheit und Finish, Abschnitt 8) mal ein Faktor der Note:

| Note | 10 | 9,5 | 9 | 8,5 | 8 | 7,5 | 7 | 6,5 oder weniger |
|---|---|---|---|---|---|---|---|---|
| Faktor | ×6 | ×4 | ×2,5 | ×1,8 | ×1,4 | ×1,2 | ×1,1 | ×0,8 |
| So viele Karten (gemessen) | 1,7 % | 10,3 % | 38,2 % | 29,6 % | 13,4 % | 4,8 % | 1,5 % | 0,5 % |

Etwa jede zweite Karte ist eine 9 oder besser (50 %), etwa jede achte eine 9,5 oder besser (12 %), eine 10 kommt bei etwa 1 von 60 Karten vor. Im Durchschnitt macht die Note den Wert **2,3-mal** so hoch. Darum lohnt sich das Einsenden in Yen nur bei den besten Karten: Eine Ultra Rare mit Gold Foil (Wert lose ¥1.800) ist im Slab im Schnitt ¥4.100 wert (bei einer 10 sind es ¥10.800), eine Art Rare oder Special Art Rare mit Premium-Finish bringt etwa so viel, wie die Gebühr kostet, und eine Common kostet mehr Gebühr, als sie je wert sein wird. Das ist gewollt: Die Gebühr ist eine Geld-Senke, und der Slab ist vor allem ein Sammlerstück.

**Slabs behalten oder verkaufen.** Ein Slab zählt beim Verkaufen von Dubletten immer als "behalten" (er taucht dort nicht auf). Einzeln verkaufen kann man ihn in der Kartenansicht ("Sell slab"), nach Bestätigung, zu seinem Wert. In "Your slabs" steht der **Bestandsbericht**: wie viele Slabs jede Note haben, der Gesamtwert, und alle Slabs mit der besten Note zuerst. Im Binder gibt es dafür den Filter "Graded" und die Sortierung nach Note.

## 10. Technik
- `src/data/packs.json`: Preise, Slots, Garantien, Banner. Eine Prüfung stoppt das Spiel mit einer klaren Meldung, wenn etwas nicht stimmt (Tabellen, Phasen, Hauptkarten).
- `src/packs/rollPack.ts`: die Würfe. `src/packs/openPack.ts`: bezahlt, würfelt, legt die Karten ab, zählt die Garantien, in einem Schritt.
- Spielstand Version 3: Garantie-Zähler, Tagesbonus, Pack-Verlauf.
- Tests: Quoten gegen die Tabellen (Monte Carlo), Garantien, Dublettenschutz, Banner-Fenster, 50/50, Wiederholbarkeit. Ein **Simulator** in den Einstellungen (Entwicklungsversion) öffnet viele Packs und zeigt die Zahlen aus Abschnitt 3 und 4.
- Show: `src/scene/pull/` (Ablauf als reiner Code, Lichteffekte, Shader, Bloom nur für den Hintergrund) und `src/ui/pull/` (Oberfläche). Ton: `src/audio/`.
- Bewertung: `src/domain/grading.ts` (Note, Gebühr, Wert, Preisleiter, Einsenden, Slab verkaufen, Bestandsbericht; alles getestet), `src/holo/wear.ts` und der Shader (Abnutzung), `src/holo/slabShape.ts`, `Slab.tsx`, `slabLabel.ts` (der 3D-Slab) und `src/ui/grading/` (Bildschirm, Frage, Zeremonie). Der Spielstand brauchte keine neue Version: Teilnoten und Note standen seit Version 1 im Besitz-Modell.
