# Packs, Geld und Preise (Deutsch)

Stand: 12. Oktober 2026. Die Stufen 3 bis 6 sind gebaut, diese Zahlen laufen so im Spiel. Alles steht als Daten in `playground/src/data/packs.json`, die Zahlen lassen sich also ohne Programmieren ändern. Die Tabellen unten kommen aus Berichten, die man selbst laufen lassen kann (Abschnitt 10).

## 1. Was du entschieden hast ✅
- **5 Karten pro Pack.**
- **Vier Packs mit eigenen Quoten und Preisen:** Booster ¥300, Select ¥1.000, Premium ¥3.000 und das Halloween Wish ¥500. Die Preise und Quoten waren meine Entscheidung (du hast gesagt, ich darf). Dahinter steckt eine Regel: **Die Top-Karten kosten bei jedem Pack etwa gleich viel** (rund ¥9.000 pro Special Art Rare, rund ¥30.000 pro Ultra Rare). Wer mehr zahlt, bekommt sie schneller und glänzender, nicht billiger. Das Booster ist für Geduldige, das Premium für alle, die gleich etwas Gutes wollen.
- **Es soll ein echter Grind sein.** Gute Karten bekommt man nur mit viel Spielen. Wir haben die Stufe "Hart" gewählt, und das Booster ist jetzt viel knapper mit guten Karten als vorher.
- **Die Quoten sind überall offen:** Zu jedem Pack gibt es eine Seite "Odds", die sagt, was du bei wie viel Prozent bekommst und nach wie vielen Packs im Schnitt.
- **Nie stuck.** Es gibt immer einen Weg, an Geld zu kommen.
- **Halloween** läuft vom 10. Oktober bis zum 4. November, **ohne Gratis-Packs**, mit einem eigenen **Banner** wie bei Genshin oder WuWa: Hauptkarten, 50/50, Garantie.
- **Kampf direkt nach den Packs.** Er ist die Haupt-Geldquelle.
- **Animation:** richtig stark, Sternschnuppe und fünf Lichtfäden kombiniert, mit Ton. Der Ton wird im Browser erzeugt (Tone.js). **Das Pack reißt du selbst auf** (wischen oder tippen), danach beginnt die Show.
- **Bewerten (Grading) ist ein Risiko.** Die Gebühr zahlst du immer, und die Prüfer finden oft mehr, als du siehst. Nur die besten Karten lohnen sich im Schnitt.

## 2. Die vier Packs
Jedes Pack hat 5 Karten in drei Arten von Plätzen: Karte 1 bis 3 (Grundkarten), Karte 4 (Plus) und Karte 5 (Treffer, immer Rare oder besser). Die Zahlen in den Tabellen sind Prozent.

| | Booster | Select | Premium | Halloween Wish |
|---|---|---|---|---|
| **Preis** | ¥300 | ¥1.000 | ¥3.000 | ¥500 |
| Double Rare oder besser | jedes 3,8. Pack | 3 von 4 Packs | jedes Pack | jedes 3,8. Pack |
| Art Rare oder besser | jedes 12,6. Pack | jedes 3,8. Pack | jedes Pack | jedes 12,6. Pack |
| Special Art Rare oder besser | jedes 50. Pack | jedes 12. Pack | jedes 4. Pack | jedes 50. Pack |
| Ultra Rare | jedes 200. Pack | jedes 50. Pack | jedes 18. Pack | jedes 200. Pack |
| Pack mit mindestens einer Foil- oder Premium-Karte | 53 % | 88 % | 100 % | 55 % |
| Pack mit mindestens einer Premium-Karte (Cosmos, Gold Foil, Prism Crystal, Radiant) | 6 % | 22 % | 56 % | 8 % |
| **Garantie** Special Art Rare oder besser | im 50. Pack | im 15. Pack | im 5. Pack | im 30. Pack |
| **Garantie** Ultra Rare | im 150. Pack | im 45. Pack | im 14. Pack | im 90. Pack |
| Yen pro Special Art Rare oder besser, im Schnitt | ¥9.500 | ¥8.700 | ¥9.400 | ¥11.400 |
| Yen pro Ultra Rare, im Schnitt | ¥31.700 | ¥29.900 | ¥29.800 | ¥36.300 |

"Jedes 50. Pack" heißt: etwa eins von 50 Packs hat so eine Karte, bevor die Garantie hilft. Das Halloween Wish hat die Quoten des Boosters, kostet aber ¥500 und bringt dafür die Chance auf Halloween-Karten und frühere Garantien (Abschnitt 4). Pro Special Art Rare zahlt man darum etwas mehr (¥11.400), pro Halloween-Karte etwa ¥17.000.

**Die Plätze:**

| Pack | Karte 1 bis 3 | Karte 4 (Plus) | Karte 5 (Treffer) |
|---|---|---|---|
| Booster | Common 68 · Uncommon 32 | Uncommon 64 · Rare 33 · Double Rare 2,5 · Art Rare 0,5 | Rare 76 · Double Rare 16,5 · Art Rare 5,5 · Special Art Rare 1,5 · Ultra Rare 0,5 |
| Select | Karte 1 und 2: Uncommon 75 · Rare 25. Karte 3: Rare 90 · Double Rare 10 | Rare 66 · Double Rare 30 · Art Rare 3,6 · Special Art Rare 0,4 | Rare 37 · Double Rare 40 · Art Rare 15 · Special Art Rare 6 · Ultra Rare 2 |
| Premium | Karte 1: Rare 75 · Double Rare 25. Karte 2: Rare 62 · Double Rare 38. Karte 3: Double Rare 92 · Art Rare 8 | Double Rare 62 · Art Rare 36 · Special Art Rare 2 | Art Rare 78 · Special Art Rare 16,5 · Ultra Rare 5,5 |
| Halloween Wish | wie Booster | wie Booster, aber hier kann eine Halloween-Karte stehen | wie Booster |

Dazu kommt das **Finish** jeder Karte (wie sie glänzt): Es wird für jede Karte einzeln gewürfelt und hängt nicht nur von der Seltenheit ab. Die Packs verschieben es mit einem Faktor ("lean"): Booster und Halloween Wish ×1 (normal), Select ×1,6, Premium ×3. Im Premium hat deshalb mehr als jedes zweite Pack eine Premium-Karte (56 %).

**Was im Schnitt in einem Pack liegt (nachgerechnet mit vielen Packs):**

| Karten pro Pack | Common | Uncommon | Rare | Double Rare | Art Rare | Special Art Rare | Ultra Rare |
|---|---|---|---|---|---|---|---|
| Booster | 2,04 | 1,60 | 1,08 | 0,19 | 0,06 | 0,02 | 0,01 |
| Select | 0 | 1,50 | 2,42 | 0,78 | 0,18 | 0,08 | 0,04 |
| Premium | 0 | 0 | 1,37 | 2,17 | 1,11 | 0,23 | 0,11 |
| Halloween Wish | 2,05 | 1,57 | 1,07 | 0,19 | 0,06 | 0,05 | 0,01 |

**Garantien (Pity).** Jedes Pack zählt für sich mit (der Zähler steht im Packs-Bildschirm):
- Hat ein Pack N-1 Mal keine Special Art Rare oder Ultra Rare gebracht, ist das N-te garantiert eine (zu 75 % eine Special Art Rare, zu 25 % eine Ultra Rare). N steht in der Tabelle oben.
- Dasselbe gilt für die Ultra Rare mit der zweiten Zahl.
- **Dublettenschutz:** Eine garantierte Karte und eine Banner-Karte sind immer ein Motiv, das du noch nicht hast (solange es noch eines gibt). Normale Karten haben keinen Schutz.
- Die Garantien lösen selten aus (im Booster Special Art Rare in 1,0 % der Packs, Ultra Rare in 0,3 %; im Premium 7,0 % und 3,8 %): sie sind das Sicherheitsnetz, nicht der Normalfall.

## 3. Wie lange dauert das Sammeln?
Simulation mit vielen Spielern, die immer nur dieses eine Pack öffnen. Erste Zahl: der Spieler in der Mitte. Zweite Zahl: "9 von 10 Spielern sind spätestens hier fertig". In Packs.

| Ziel | Booster (¥300) | Select (¥1.000) | Premium (¥3.000) |
|---|---|---|---|
| Erste Special Art Rare | 50 / 74 | 11 / 19 | 4 / 6 |
| Erste Ultra Rare | 100 / 150 | 27 / 45 | 11 / 14 |
| Alle Common bis Double Rare (44 Motive) | 65 / 114 | nicht im Pack | nicht im Pack |
| Alle Art Rare (9) | 438 / 754 | 127 / 219 | 20 / 35 |
| Alle Special Art Rare (6) | 359 / 534 | 106 / 164 | 43 / 59 |
| Alle Ultra Rare (5) | 570 / 796 | 172 / 232 | 60 / 77 |
| **Alles, was das Pack geben kann** | **627 / 821** | **187 / 252** | **62 / 77** |
| In Yen | ¥188.000 / ¥246.000 | ¥187.000 / ¥252.000 | ¥186.000 / ¥231.000 |

Das ist Absicht: **Das ganze Set kostet bei jedem Pack etwa gleich viel** (rund ¥190.000 im Schnitt). Bei etwa ¥1.500 am Tag sind das gut 120 Tage. Select und Premium geben keine Commons (Premium auch keine Uncommons), darum meint die Zeile "alles" dort nur, was das Pack überhaupt hergibt. Wer die Packs mischt, liegt dazwischen.

Schlimmster Fall durch die Garantien: Im Booster höchstens 5 × 150 = 750 Packs allein für die Ultra Rare, also nie unbegrenzt.

## 4. Halloween Wish (Banner)
**¥500 pro Pack, 10. Oktober bis 4. November 2026.** Es gibt keine Gratis-Packs.

- **Aufbau:** Karte 1 bis 4 wie im Booster. In Slot 4 (Plus) kann statt der normalen Karte eine der 10 Halloween-Karten stehen. Slot 5 (Treffer) ist wie normal, mit den normalen Garantien (hier im 30. und 90. Pack).
- **Chance auf eine Banner-Karte:** 1,6 % pro Pack. Nach 44 Packs ohne Banner-Karte steigt die Chance mit jedem Pack um 7 Prozentpunkte. Im 70. Pack ist eine Banner-Karte sicher.
- **Hauptkarten und 50/50:** Pro Phase gibt es 2 Hauptkarten. Eine Banner-Karte ist zu 50 % eine Hauptkarte, sonst eine der anderen 8 Halloween-Karten. Verlierst du das 50/50, ist die nächste Banner-Karte sicher eine Hauptkarte.
- **Phasen:** Phase 1 (10. bis 22. Oktober): Nino Treat (Sweet Treats) und Miku Trick (Haunting Melody). Phase 2 (23. Oktober bis 4. November): Ichika Treat (Costume Change) und Itsuki Trick (Starving Ghost). Garantie und 50/50-Stand bleiben beim Phasenwechsel erhalten. Yotsuba hat diesmal keine Hauptkarte; das lässt sich in den Daten ändern.
- **Dublettenschutz** gilt auch hier: die Banner-Karte ist wenn möglich eine, die du noch nicht hast.
- **Was das heißt:** Eine Banner-Karte kostet im Schnitt etwa 34 Packs (¥17.000). Nach 25 Packs hast du im Schnitt 0,4 Banner-Karten (35 % haben mindestens eine), nach 50 Packs 1,2 (93 %), nach 75 Packs 1,8 und 1,1 Hauptkarten (81 % haben mindestens eine Hauptkarte). Alle 10 Karten schafft niemand in einem Event: sie kommen im nächsten Jahr wieder.
- Halloween-Karten stecken weder in normalen Packs noch im Kiosk.
- Eine Banner-Karte (Special Art Rare) setzt auch die Special-Art-Rare-Garantie zurück.
- Auf der Odds-Seite des Halloween Wish steht, nach wie vielen Packs im Schnitt und spätestens eine Halloween-Karte kommt.

## 5. Geld (Yen)
| | |
|---|---|
| Startgeld | ¥1.500 (5 Booster) |
| Tagesbonus | ¥400 pro Tag. Verpasste Tage sammeln sich bis zu 3 Tage an. Wird heute schon abgeholt über die Packs-Seite |
| Kämpfe (Stufe 4) | Sieg ¥150 / ¥250 / ¥400 (Leicht / Normal / Schwer), Niederlage ¥50, erster Sieg des Tages +¥200. Das ist die Haupt-Geldquelle |
| Dubletten verkaufen (Stufe 5) | siehe Abschnitt 8 (gebaut) |
| Dex-Belohnungen (Stufe 5) | alle 10 neuen Motive 1 Gratis-Pack, ¥2.000 für jede komplette Figur (gebaut) |

Ziel: Wer täglich etwa 30 Minuten spielt, bekommt ungefähr ¥1.500 am Tag. Das sind 5 Booster, 1,5 Select oder ein halbes Premium.

## 6. Nie stuck
- **Starter-Deck** (Stufe 4): Jeder neue Spielstand bekommt ein spielbares 30er-Deck. Du kannst also immer kämpfen und Geld verdienen, auch ohne ein einziges Pack.
- **Jeder Kampf zahlt etwas,** auch eine Niederlage.
- **Der Tagesbonus kommt immer.**
- **Verkauft wird nur, was übrig ist:** nie die letzte Kopie eines Motivs, nie Karten aus dem Deck, nie eine bewertete Karte.
- **Das Geld kann nie unter null fallen.**
- **Die Garantien begrenzen das Pech nach oben** (Abschnitt 3).

## 7. Der Ablauf beim Öffnen (so ist es gebaut)
1. **Packs-Bildschirm:** die Packs als Karten (Banner zuerst, wenn er läuft), jeweils mit Preis, wie oft ein gutes Pack kommt, Garantie-Balken, "1 Pack" oder "5 Packs" öffnen und "Odds". Dazu die letzten Packs und der Tagesbonus. Die **Odds-Seite** gehört zu je einem Pack: Vergleich aller Packs, was in einem Pack steckt (Chance und Durchschnitt pro Kartenart), die Garantien in Packs und Yen, die Finishes, die Tabellen der fünf Plätze und beim Halloween Wish die Banner-Regeln. Alles wird aus denselben Daten berechnet, aus denen auch gewürfelt wird.
2. **Das Ergebnis steht sofort fest und ist gespeichert,** noch bevor die Animation beginnt. Überspringen, Abbrechen oder Fenster schließen ändert nichts.
3. **Aufreißen:** Das Pack liegt auf dem Tisch. Mit einem Wisch am oberen Rand (Maus, Finger oder Stift) reißt du es auf, die Lasche klappt weg. Ein Tippen (oder die Leertaste) reißt es auch auf. Lässt du nach gut einem Drittel los, reißt es von selbst ganz auf, davor springt es zurück. Am Ende kommt ein Weißblitz, dann beginnt die Show. Öffnest du 5 Packs, reißt du jedes einzeln auf. Bei "Pack-Animation: Aus" fällt das Aufreißen weg.
4. **Die Show:**
   - **Sturm:** Die Kamera fällt aus großer Höhe in ein Sturmauge (Vorbild: die Gacha-Animation von Wuthering Waves, aber komplett selbst gebaut).
   - **Nadel und Tor:** Im schwarzen Raum fliegt eine **Lichtnadel** mit langem Schweif von unten links in ein **Tor**, ein dunkles Loch in einem Ring aus wirbelnden Wolken. Dazu kommen Geschwindigkeitslinien und dünne Umlaufbahnen. Die **Farbe** verrät die beste Karte im Pack: blau (Common bis Rare), violett (Double Rare), rosa (Art Rare), gold (Special Art Rare), Regenbogen (Ultra Rare). Bei besseren Packs wechselt sie unterwegs die Farbe nach oben (blau, violett, gold). Zum Schluss stürzt die Nadel ins Tor, das Bild verwischt zur Mitte hin, dann kommt der **Weißblitz** mit Kreuzstern und Lichtadern.
   - Bei **Special Art Rare** und **Ultra Rare** weben sich zusätzlich **fünf Lichtfäden** in den Herz-Farben der Schwestern um die Nadel. Sie hängt kurz vor dem Tor, die Fäden ziehen sich zu, dann stürzt sie hinein.
   - **Aufschlag:** Blitz, Druckwellen, Lichtstrahlen und ein Funkenregen. Je besser die Karte, desto größer.
   - **Zeremonie** (ab Art Rare, nur in der ausführlichen Version): Der Bildschirm wird schwarz, eine dünne Linie wird gezogen, ein gezackter Ausschlag schießt in der Mitte hoch, und **Sterne leuchten nacheinander auf**: drei bei Art Rare, vier bei Special Art Rare, fünf bei Ultra Rare (in den fünf Herz-Farben). Danach kommen die Karten.
   - **Aufdecken:** Die Karten kommen verdeckt herein, die schlechteren zuerst und die beste zuletzt. Hinter der Karte drehen sich Lichtstrahlen in der Farbe der Seltenheit. Bei Special Art Rare und Ultra Rare hält die Karte auf der Kante an, der Hintergrund wird dunkel und die Kamera fährt heran, dann dreht sie sich mit ihrem echten 3D-Finish auf.
   - **Namensschild:** Seltenheit, Name, Titel, "NEU" oder "Dublette", Finish und ob es eine Garantie oder Hauptkarte war.
   - **Ergebnis:** alle Karten, was neu ist und dein Card-Dex-Stand.
   - Tippen, Leertaste oder Pfeil rechts geht weiter, Escape oder "Überspringen" springt zum Ergebnis.
5. **Einstellungen:** Pack-Animation Ausführlich, Kurz oder Aus. Lautstärke und Ton aus. Bei "Verringerte Bewegung" im Betriebssystem läuft automatisch die kurze Version.
6. **Ton (Tone.js):** ein Reißen beim Aufmachen, Wind und tiefes Dröhnen beim Sturm, Aufstieg beim Flug, Herzschlag, Aufschlag mit tiefem Schlag und Rauschen, bei der Zeremonie eine Glocke pro Stern (jede höher als die davor), Glockenklänge die mit der Seltenheit wachsen, Funkeln bei neuen Karten.

## 8. Kiosk, Verkaufen und Dex-Belohnungen (Stufe 5, gebaut)
**Kiosk** (Menü "Shop"): Damit gute Karten ein Grind bleiben, verkauft der Kiosk nur bis **Double Rare**, immer mit normalem Finish. Art Rare, Special Art Rare, Ultra Rare und die Halloween-Karten gibt es nur aus Packs. Jeden Tag liegen **8 Karten** im Regal (3 Common, 2 Uncommon, 2 Rare, 1 Double Rare), für den ganzen Tag dieselben, am nächsten Tag andere. Jedes Angebot kann pro Tag **2-mal** gekauft werden.

| Seltenheit | Kiosk-Preis |
|---|---|
| Common | ¥30 |
| Uncommon | ¥80 |
| Rare | ¥250 |
| Double Rare | ¥800 |

**Verkaufen** (Shop, Reiter "Sell spare cards"): Nur **Dubletten**. Common ¥3, Uncommon ¥8, Rare ¥25, Double Rare ¥70, Art Rare ¥120, Special Art Rare ¥250, Ultra Rare ¥600. Finish multipliziert: Foil (Rainbow Holo, Sparkle) ×1,6, Premium (Cosmos, Gold Foil, Prism Crystal, Radiant) ×3. Ein typisches Pack bringt verkauft unter ¥100 (ein Fünftel des Preises); nur die besten Packs mit Premium-Karten bringen mehr als sie kosten. Behalten wird immer: **eine Kopie jedes Motivs** (die mit dem schönsten Finish und dem besten Zustand), **so viele Kopien, wie dein größtes Deck braucht**, jede Kopie in der **Vitrine** und jede **bewertete** Karte. Der Rest kann verkauft werden, nach Bestätigung.

**Dex-Belohnungen** (Seite "Card Dex"): alle **10 neuen Motive 1 Gratis-Pack** (ein Booster, nicht das Banner), **¥2.000** für jede Figur, von der du alle Motive hast. Jede Belohnung gibt es nur einmal. Die Gratis-Packs werden auf der Packs-Seite geöffnet, mit der vollen Animation.

## 9. Bewertung ("Grading", Stufe 6, gebaut)
Jede Kopie hat von Anfang an **vier versteckte Teilnoten** von 1 bis 10: **Centering** (sitzt der Druck in der Mitte?), **Corners** (Ecken), **Edges** (Kanten) und **Surface** (Oberfläche). Das Spiel würfelt sie beim Drucken der Karte, die meisten verlieren etwa einen Punkt, wenige viel, manche nichts.

**Man sieht sie, aber nicht alle.** In der 3D-Ansicht zeigt der Shader die Abnutzung: ein schiefer Druck (weißer Streifen an einer Seite), weiße Ecken und Kanten, Kratzer, die aufblitzen, wenn das Licht darüber streicht, und ein matter Schleier. Die **Prüfer schauen aber genauer als du:** Bei jeder Teilnote können sie noch einen versteckten Fehler finden. Ohne sichtbare Abnutzung finden sie bei jeder zweiten Teilnote etwas (50 %), für jeden Punkt, der schon fehlt, kommen 15 Prozentpunkte dazu (höchstens 92 %). Finden sie etwas, kostet es im Schnitt einen Punkt, manchmal viel mehr. Darum ist keine Karte sicher, auch keine, die perfekt aussieht, und eine abgenutzte Karte ist fast nie gut.

**Einsenden** (Menü "Grading", oder "Grade it" in der Kartenansicht): keine Wartezeit, aber ein **Prüftisch**. Er zeigt vorher, wie die Karte **fürs Auge** aussieht (perfekt, sauber, abgenutzt oder ramponiert), die vier Dinge, die geprüft werden, und **was die Prüfer sagen könnten:** die Chance für jede Note, daneben was die Karte in der Hülle wert wäre und was sie lose wert ist, dazu ein Urteil (eine sehr gute, gute, riskante oder schlechte Wette) und die Gebühr. Die Zahlen kommen aus demselben Code wie die Bewertung selbst, es gilt also genau das, was dort steht. Die Gebühr wird immer bezahlt, auch bei einer schlechten Note. Das Ergebnis wird **zuerst gespeichert**, dann kommt die Zeremonie: Die Karte liegt unter einer Lampe und wird viermal geprüft, nach jeder Prüfung füllt sich eine Anzeige mit der Teilnote, dann werden sie addiert und die Gesamtnote gestempelt. Eine 10 bekommt goldene Strahlen und Funken, eine 9,5 Funken. Die Zeremonie lässt sich jederzeit überspringen.

| Seltenheit | Gebühr |
|---|---|
| Common, Uncommon, Rare | ¥300 |
| Double Rare, Art Rare | ¥800 |
| Special Art Rare, Ultra Rare | ¥1.500 |

**Die Note** ist der Durchschnitt der vier Teilnoten, die die Prüfer geben, abgerundet auf halbe Punkte; ab 9,75 ist es eine 10. Die Karte kommt im **Slab** zurück (durchsichtige Hülle mit Etikett oben: Note, Wort, die vier Teilnoten, Datum) und sieht in der 3D-Ansicht auch so aus. Die Wörter: 10 Pristine, 9,5 Gem Mint, 9 Mint, 8 bis 8,5 Near Mint, 7 bis 7,5 Excellent, 5 bis 6,5 Good, darunter Played.

**Der Wert** ist der Preis der Karte (Seltenheit und Finish, Abschnitt 8) mal ein Faktor der Note. Unter einer 8,5 ist die Karte in der Hülle weniger wert als lose, das ist das Risiko:

| Note | 10 | 9,5 | 9 | 8,5 | 8 | 7,5 | 7 | 6,5 oder weniger |
|---|---|---|---|---|---|---|---|---|
| Faktor | ×10 | ×4,5 | ×2 | ×1,2 | ×0,85 | ×0,65 | ×0,5 | ×0,35 |

**Wie gut die Chancen sind, hängt davon ab, wie die Karte aussieht** (gemessen mit 200.000 Karten):

| Wie die Karte aussieht | Anteil aller Karten | 10 | 9,5 oder besser | 9 oder besser | 8,5 oder besser | 8 oder besser | Faktor im Schnitt |
|---|---|---|---|---|---|---|---|
| Sieht sauber aus (9,6 oder besser) | 5 % | 2,7 % | 24,0 % | 70,8 % | 91,3 % | 98,0 % | ×2,48 |
| Sieht gut aus (8,8 bis 9,6) | 52 % | 0,0 % | 0,6 % | 19,5 % | 58,9 % | 85,8 % | ×1,19 |
| Sieht abgenutzt aus (unter 7,5) | 3 % | 0 % | 0 % | 0 % | 0 % | 0 % | ×0,37 |
| **Alle Karten** | 100 % | 0,1 % | 1,5 % | 13,8 % | 37,2 % | 62,1 % | ×1,02 |

Eine 10 gibt es bei etwa 1 von 1000 Karten, eine 9 oder besser bei etwa 1 von 7. Eine ganz normale Karte ist in der Hülle im Schnitt genauso viel wert wie vorher (Faktor 1,02), und dann ist die Gebühr weg. Darum lohnt sich das Einsenden **nur bei den besten Karten:** Eine Ultra Rare mit Premium-Finish, die sauber aussieht (lose ¥1.800), ist in der Hülle im Schnitt ¥4.385 wert, also bleiben nach Wert und Gebühr ¥1.085 Gewinn (bei einer 10 wäre die Hülle ¥18.000 wert). Eine Special Art Rare mit Premium-Finish, die sauber aussieht, verliert im Schnitt ¥423, und eine Common, Uncommon oder Rare verliert auch im besten Fall fast die ganze Gebühr (¥190 bis ¥300). Das ist gewollt: Die Gebühr ist eine Geld-Senke, man muss die Karten gut aussuchen (der Prüftisch hilft dabei), und der Slab ist vor allem ein Sammlerstück. Wer es einfacher haben will, kann die Faktoren in `GRADE_MULTIPLIERS` und die Fehler-Chancen in `HIDDEN_FLAW_*` in `src/domain/grading.ts` lockern.

**Slabs behalten oder verkaufen.** Ein Slab zählt beim Verkaufen von Dubletten immer als "behalten" (er taucht dort nicht auf). Einzeln verkaufen kann man ihn in der Kartenansicht ("Sell slab"), nach Bestätigung, zu seinem Wert. In "Your slabs" steht der **Bestandsbericht**: wie viele Slabs jede Note haben, der Gesamtwert, und alle Slabs mit der besten Note zuerst. Im Binder gibt es dafür den Filter "Graded" und die Sortierung nach Note.

## 10. Technik
- `src/data/packs.json`: die vier Packs mit Preis, Plätzen, Finish-Faktor, Garantien und beim Halloween Wish dem Banner. Eine Prüfung (`parsePacks`) stoppt das Spiel mit einer klaren Meldung, wenn etwas nicht stimmt (Tabellen, Phasen, Hauptkarten, jedes Pack gibt 5 Karten und der Treffer ist mindestens Rare).
- `src/packs/rollPack.ts`: die Würfe. `src/packs/openPack.ts`: bezahlt, würfelt, legt die Karten ab, zählt die Garantien pro Pack, in einem Schritt.
- `src/packs/odds.ts`: die genaue Mathematik hinter der Odds-Seite (Chance auf mindestens eine Karte einer Art, Durchschnitt mit Garantie, Banner genau durchgerechnet). Die Tests prüfen sie gegen Zufallsläufe (Monte Carlo).
- Spielstand: Garantie-Zähler pro Pack (`sar:<pack>`, `ur:<pack>`), Banner-Zähler und der Hauptkarten-Merker, Tagesbonus, Pack-Verlauf. Alte Spielstände übernehmen ihre gemeinsamen Zähler für Booster und Halloween Wish.
- Tests: Quoten gegen die Tabellen (Monte Carlo), Garantien, Dublettenschutz, Banner-Fenster, 50/50, Wiederholbarkeit, alles für jedes Pack. Ein **Simulator** in den Einstellungen (Entwicklungsversion) öffnet viele Packs und zeigt die Zahlen. Die Berichte für diese Seite: `SIM=1 npx vitest run src/packs/economy.report --reporter=verbose` (Abschnitte 2 bis 4) und `SIM=1 npx vitest run src/domain/grading.report --reporter=verbose` (Abschnitt 9).
- Show: `src/scene/pull/` (Ablauf als reiner Code mit der Phase "tear" fürs Aufreißen, Lichteffekte, Shader, Bloom nur für den Hintergrund) und `src/ui/pull/` (Oberfläche, `PackTear` fürs Aufreißen). Ton: `src/audio/`.
- Bewertung: `src/domain/grading.ts` (versteckte Fehler, Note, Gebühr, Wert, genaue Chancen, Urteil, Einsenden, Slab verkaufen, Bestandsbericht; alles getestet), `src/holo/wear.ts` und der Shader (Abnutzung), `src/holo/slabShape.ts`, `Slab.tsx`, `slabLabel.ts` (der 3D-Slab) und `src/ui/grading/` (Prüftisch, Bildschirm, Frage, Zeremonie). Der Spielstand brauchte keine neue Version: Teilnoten und Note standen seit Version 1 im Besitz-Modell.
