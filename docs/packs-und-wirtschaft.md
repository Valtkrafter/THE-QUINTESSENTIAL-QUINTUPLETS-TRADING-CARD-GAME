# Packs, Geld und Preise: Entwurf (Deutsch)

Stand: 10. Oktober 2026. Das ist ein Vorschlag. Nichts davon ist gebaut, bevor du es bestätigt hast. Alle Zahlen stehen später in einer einzigen Tabelle (Daten, kein Code), damit man sie ohne Programmieren ändern kann.

Die Zahlen für die Packs sind mit einer Simulation geprüft (Zufallsspiel mit je 3000 bis 5000 Durchläufen). Die Zahlen für Kiosk, Verkauf und Bewertung sind Entwürfe und werden in Stufe 4 und 5 nochmal besprochen.

## 1. Die Grundidee

- Das Spiel ist für immer kostenlos. Yen (¥) ist nur Spielgeld, es gibt keinen Weg, echtes Geld auszugeben.
- Nichts drängt dich: keine Zeitlimits außer dem Halloween-Fenster, keine Strafen fürs Auslassen, keine versteckten Quoten.
- Die Quoten sind für dich einsehbar und stammen aus denselben Daten wie das echte Verfahren. Die Seite kann also nicht von der Wirklichkeit abweichen.
- Jede Ziehung ist wiederholbar (fester Startwert im Spielstand). Schließt du das Fenster mitten in der Animation, sind die Karten trotzdem schon in deiner Mappe.

## 2. Geld (Yen)

| | Vorschlag |
|---|---|
| Startgeld | ¥1.500 (3 Packs, damit du sofort etwas öffnen kannst) |
| Tagesbonus | ¥400 pro Tag. Verpasste Tage sammeln sich bis zu 3 Tage an, du verlierst also nichts, wenn du mal fehlst |
| Kämpfe (Stufe 6) | Sieg ¥150 / ¥250 / ¥400 (Leicht / Normal / Schwer), Niederlage ¥50, erster Sieg des Tages +¥200 |
| Dubletten verkaufen (Stufe 4) | siehe Abschnitt 8 |
| Dex-Belohnungen (Stufe 4) | alle 10 neuen Motive 1 Gratis-Pack, ¥2.000 für jede komplette Figur |
| Halloween | während des Events 1 Gratis-Halloween-Pack pro Tag |

Ziel: Wer täglich etwa 15 Minuten spielt, bekommt ungefähr ¥1.000 am Tag, also 2 Packs.

## 3. Die Packs

Es gibt zwei Packs, beide zu ¥500:

- **TQQ01 Booster**: das normale Pack, immer da. Enthält die 69 normalen Motive.
- **Halloween Booster**: nur im Event-Zeitraum, siehe Abschnitt 5.

**5 Karten pro Pack.** Fünf Karten lassen sich einzeln und spannend aufdecken, und mit nur 69 Motiven wären 10 Karten pro Pack fast nur Dubletten.

| Slot | Was darin liegen kann |
|---|---|
| Slot 1 bis 3 | Common 60 % · Uncommon 40 % |
| Slot 4 ("Plus") | Uncommon 35 % · Rare 40 % · Double Rare 15 % · Art Rare 10 % |
| Slot 5 ("Treffer") | Rare 32 % · Double Rare 24 % · Art Rare 22 % · Special Art Rare 16 % · Ultra Rare 6 % |

Innerhalb einer Seltenheit hat jedes Motiv die gleiche Chance.

**Was das im Durchschnitt pro Pack heißt:** 1,8 Common, 1,5 Uncommon, 0,7 Rare, 0,4 Double Rare, 0,3 Art Rare, 0,16 Special Art Rare, 0,06 Ultra Rare.
Mit 76 % Chance ist mindestens eine Double Rare oder besser dabei, mit 22 % eine Special Art Rare oder Ultra Rare, mit 6 % eine Ultra Rare.

**Finish (Holo-Look):** Das Finish wird für jede Karte extra gewürfelt, unabhängig von der Seltenheit. Je seltener die Karte, desto eher ist es ein besonderes Finish.

| Seltenheit | normal | Foil (Rainbow, Sparkle) | Premium (Cosmos, Gold, Prism, Radiant) |
|---|---|---|---|
| Common | 94 % | 6 % | 0 % |
| Uncommon | 88 % | 12 % | 0 % |
| Rare | 78 % | 20 % | 2 % |
| Double Rare | 60 % | 34 % | 6 % |
| Art Rare | 40 % | 45 % | 15 % |
| Special Art Rare | 15 % | 35 % | 50 % |
| Ultra Rare | 5 % | 25 % | 70 % |

Im Schnitt hat etwa jede Packung 1 Karte mit Sonderfinish, und etwa jedes fünfte Pack eine mit Premium-Finish. Diese Zahlen stammen aus dem alten Entwurf und sind unverändert.

## 4. Schutz gegen Pech (Pity)

- **Garantie auf Special Art Rare oder besser:** Hattest du 19 Packs in Folge keine, ist das 20. Pack garantiert eine (zu 75 % Special Art Rare, zu 25 % Ultra Rare).
- **Garantie auf Ultra Rare:** Nach 59 Packs ohne Ultra Rare ist das 60. Pack garantiert eine.
- **Dublettenschutz:** Eine garantierte Karte ist immer ein Motiv, das du noch nicht hast (solange es noch eines gibt). Die Garantie wird also nie verschwendet.
- Beide Zähler siehst du in der Pack-Ansicht als Balken ("Garantie in 7 Packs").

## 5. Halloween-Event

| | Vorschlag |
|---|---|
| Zeitraum | 15. Oktober bis 4. November, jedes Jahr wieder (Datum kommt aus der Uhr des Geräts) |
| Karten | die 10 Halloween-Karten (2 pro Schwester, Special Art Rare, 2 Erinnerungen beim K.O.) |
| Preis | ¥500, genauso wie das normale Pack |
| Gratis | 1 Halloween-Pack pro Tag während des Events |
| Inhalt | Slot 1 bis 4 wie normal. Slot 5: mit 15 % eine der 10 Halloween-Karten, sonst der normale Treffer-Slot |
| Garantie | Spätestens jedes 5. Halloween-Pack enthält eine Halloween-Karte, die du noch nicht hast |

Nach der Simulation hat man alle 10 Karten nach etwa 48 Packs (nie mehr als 50). Mit 21 Gratis-Packs sind das nur etwa 27 gekaufte, also ¥13.500 in 3 Wochen. Wer jeden Tag kurz spielt, schafft alle 10.
Halloween-Karten stecken nicht in normalen Packs und nicht im Kiosk. Verpasst du das Event, kommen sie nächstes Jahr wieder. Zum Testen gibt es in der Entwicklungsversion einen Schalter, der das Event ein- und ausschaltet.

## 6. Wie lange dauert das Sammeln?

Ergebnis der Simulation für das normale Pack (69 Motive), mit Garantie und Dublettenschutz:

| Ziel | Packs (Mitte) | Packs (9 von 10 Spielern sind spätestens hier fertig) | Ungefähr in Tagen (2 Packs pro Tag) |
|---|---|---|---|
| Erste Double Rare | 2 | | am ersten Tag |
| Erste Special Art Rare | 4 | | am ersten Tag |
| Erste Ultra Rare | 11 | | etwa 1 Woche |
| Alle Common, Uncommon, Rare, Double Rare | 66 | 101 | gut 1 Monat |
| Alle Art Rare | 74 | 125 | |
| Alle Special Art Rare | 81 | 146 | |
| Alle Ultra Rare | 157 | 279 | |
| **Komplettes Set (69 Motive)** | **167** | **280** | etwa 3 Monate |

Mit dem Kiosk (Abschnitt 8) kann man fehlende Motive auch kaufen. Dann sind Finish, Seriennummer und Zustand der Teil, für den man Glück braucht.

## 7. Der Ablauf beim Öffnen

1. **Packs-Bildschirm:** Du siehst die Packs, den Preis, deine Garantie-Zähler und einen Link "Quoten ansehen". Ein Klick auf "Öffnen" bucht das Geld ab.
2. **Ergebnis wird sofort festgelegt und gespeichert.** Die Animation zeigt nur, was schon feststeht. Abbrechen, Überspringen oder Fenster schließen ändert nichts.
3. **Animation (ruhig, nicht grell):** Das Pack liegt im Licht. Du ziehst darüber, um es aufzureißen (oder klickst). Die 5 Karten gleiten verdeckt heraus. Du deckst sie nacheinander auf, oder klickst "Alle aufdecken".
   - Common und Uncommon: schnelles Umdrehen.
   - Rare: kurzer sanfter Glanz.
   - Double Rare und Art Rare: Schein in der Herz-Farbe der Figur, langsameres Umdrehen.
   - Special Art Rare und Ultra Rare: der Hintergrund wird dunkler, kurze Pause, dann dreht sich die Karte mit ihrem echten 3D-Finish auf.
4. **Ergebnis-Seite:** Alle 5 Karten, mit Marken "NEU" oder "Dublette", Finish-Name und wie sich dein Card-Dex verändert hat ("+2 neue Motive, 31/79"). Knöpfe: "Noch ein Pack", "Dubletten verkaufen" (ab Stufe 4), "Zur Sammelmappe".
5. **Einstellung "Animation":** Ausführlich, Kurz oder Aus. Standard: Ausführlich.

## 8. Was später kommt (Entwurf)

**Verkaufen (Stufe 4):** Es werden nur Dubletten verkauft, nie die letzte Kopie eines Motivs und nie eine bewertete Karte.

| Seltenheit | Verkaufswert (normales Finish) |
|---|---|
| Common | ¥3 |
| Uncommon | ¥8 |
| Rare | ¥25 |
| Double Rare | ¥70 |
| Art Rare | ¥120 |
| Special Art Rare | ¥250 |
| Ultra Rare | ¥600 |

Das Finish multipliziert den Wert: normal ×1, Foil ×1,6, Premium ×3. Würdest du den Inhalt eines Packs komplett verkaufen, bekämst du etwa 40 % des Preises zurück. Das Spiel gibt dir also Geld zurück, aber Packs bleiben ein echter Posten.

**Kiosk (Stufe 4):** Täglich wechselnde Angebote (8 Karten, höchstens 1 Art Rare oder besser). Gekauft wird immer die Karte mit normalem Finish. Das Finish ist also weiterhin das Glück beim Packs-Öffnen.

| Seltenheit | Kiosk-Preis |
|---|---|
| Common | ¥30 |
| Uncommon | ¥80 |
| Rare | ¥250 |
| Double Rare | ¥800 |
| Art Rare | ¥3.000 |
| Special Art Rare | ¥8.000 |
| Ultra Rare | ¥20.000 |

Halloween-Karten gibt es nicht im Kiosk.

**Bewertung (Stufe 5):** Keine Wartezeit, nur eine kleine Zeremonie beim Aufdecken. Gebühr ¥200 (Common bis Rare), ¥500 (Double Rare und Art Rare), ¥1.000 (Special Art Rare und Ultra Rare). Die Note ist der Durchschnitt der vier versteckten Teilnoten und verändert den Wert: 10 ×6, 9,5 ×4, 9 ×2,5, 8,5 ×1,8, 8 ×1,4, 7 ×1,1, 6,5 oder weniger ×0,8. Nach den heutigen Würfen (nachgerechnet) ist etwa jede zweite Karte eine 9 oder besser, etwa jede achte eine 9,5 oder besser, und eine 10 kommt nur bei etwa 1 von 60 Karten vor.

## 9. Wie ich es technisch bauen würde (Stufe 3)

- **Packs als Daten:** Jedes Pack ist eine Datei mit Preis, Slots, Tabellen, Garantien und Zeitfenster. Eine Prüfung stoppt das Spiel, wenn eine Tabelle nicht auf 100 % kommt.
- **Reine Regel-Funktion:** `Pack öffnen (Spielstand, Pack, Zeitpunkt) → neuer Spielstand + Ergebnis`. Sie nutzt den Zufall aus dem Spielstand, bucht Geld und Karten und die Garantie-Zähler in einem Schritt. Die gleiche Eingabe gibt immer das gleiche Ergebnis.
- **Spielstand Version 3:** Dazu kommen der Tagesanspruch für das Gratis-Halloween-Pack und ein kurzer Verlauf der letzten Packs. Alte Spielstände werden automatisch aufgewertet.
- **Quoten-Seite:** Wird aus den gleichen Pack-Daten erzeugt.
- **Tests:** Quoten werden mit sehr vielen simulierten Packs gegen die Tabellen geprüft, Garantien dürfen nie überschritten werden, der Dublettenschutz wird geprüft, das Event-Fenster und die Wiederholbarkeit auch.
- **Simulator:** Ein Befehl öffnet z. B. 100.000 Packs und gibt die Zahlen aus. So kann man später die Werte feinjustieren.
- **Animation:** Eine einzige 3D-Fläche mit Pack und 5 Karten (nicht 5 getrennte). Dafür muss der Karten-Painter mehrere Karten auf einmal können. Wo es schwach läuft (Intel UHD), gibt es die Stufe "Kurz" oder "Aus".

## 10. Was ich von dir brauche

1. **5 Karten für ¥500 pro Pack** (oder lieber 10 Karten für ¥1.000?)
2. **Startgeld ¥1.500** und **Tagesbonus ¥400** (mit Ansparen bis 3 Tage)
3. **Die Quoten aus Abschnitt 3**: Ultra Rare 6 % pro Pack, Special Art Rare oder besser 22 %
4. **Garantie** nach 20 Packs (Special Art Rare oder besser) und 60 Packs (Ultra Rare), mit Dublettenschutz
5. **Halloween**: 15. Oktober bis 4. November, jedes Jahr wieder, 1 Gratis-Pack pro Tag, Garantie alle 5 Packs
6. **Animation**: ruhig, mit Ausführlich, Kurz und Aus
7. Die Entwürfe in Abschnitt 8 (Verkauf, Kiosk, Bewertung) sind nur zur Information, ich frage in Stufe 4 und 5 nochmal.
