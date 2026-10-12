# TQQ TCG: glossary and writing rules

Everything in the game is written in English, in plain words. This list is the source of the game's own words: the screens, the card texts and the docs use exactly these terms and explain them the same way. New words are added here first.

## Writing rules for card and rules texts

1. **One idea per sentence, short.** Up to two or three sentences, 110 characters at most (`cards/descriptions.test.ts` checks it).
2. **Say what happens, not the rule behind it.** "Heal 30 HP on one of your Characters." instead of "Heal 30 damage from 1 of your Characters."
3. **Numbers first.** "+30 damage for each Heart on this Character." instead of "Does 30 more damage for each Heart attached to this Character."
4. **Same words everywhere.** The opponent's front card is always "the enemy Active Character". Your waiting cards are always "your Bench".
5. **Heads and tails explain themselves.** "Flip a coin. Heads: draw 4 cards. Tails: draw 1 card."
6. **Move and ability names stay cool, their descriptions stay plain.**

## Collecting

| Word | What it means |
|---|---|
| **Pack** | 5 cards. There are four kinds: the Booster (¥300), the Select (¥1,000), the Premium (¥3,000) and the Halloween Wish (¥500). You tear it open yourself, then the show begins. |
| **Odds** | What can come out of a pack and how likely it is. Every pack has an Odds page, worked out from the same data as the draw. |
| **Banner / Wish** | A time-limited pack with its own cards (Halloween Wish). Some of its cards are *featured* (50/50, then sure). |
| **Rarity** | How rare a design is: Common, Uncommon, Rare, Double Rare, Art Rare, Special Art Rare, Ultra Rare (C, U, R, RR, AR, SAR, UR). |
| **Finish** | How one printed copy shines: Standard, Rainbow Holo, Sparkle, Cosmos, Gold Foil, Prism Crystal, Radiant. Luck, not design. |
| **Binder** | All your cards. **Card Dex** shows how many of the 79 designs you have found. **Showcase** shows your six favorites. |
| **Guarantee** | A card that is sure to come after a number of packs without one. |
| **Grading** | Send a loose card in (¥300 to ¥1,500, paid whatever the score is) and get a score from 1 to 10 back, in a sealed case. A high score makes the card worth much more, a low one makes it worth less than before. It is a bet: the graders look closer than you can. |
| **Marks** | The four marks every copy has: centering, corners, edges and surface. You can see them as wear in the 3D view. The graders may find a little more than shows. The score is the average of the marks they give. |
| **Score** | The grade of a card, from 1 to 10 in steps of a half. The words on the label: Pristine (10), Gem Mint (9.5), Mint (9), Near Mint (8 to 8.5), Excellent (7 to 7.5), Good (5 to 6.5), Played (below 5). |
| **Slab** | A graded card in its clear case, with a paper label on top that shows the score and the four marks. |
| **Loose card** | A card that has not been graded. |
| **Tutorial** | The short guide a tab shows the first time you open it. You do every step yourself, and it cannot be skipped. |

## Fighting

| Word | What it means |
|---|---|
| **Character** | A card of one of the sisters. It has HP, moves and sometimes an ability. |
| **Supporter** | A card of someone around the sisters. Play one per turn: draw, heal, search, disrupt. |
| **Heart** | The energy that pays for moves. You get 2 free Hearts each turn and give them to your Characters (nobody gets Hearts in the first turn of the player who goes first; the player who goes second gets 3 in their first turn). A move **uses up** its Hearts: they are taken off the Character when it attacks. A Heart always has the kind of the Character that holds it. |
| **Turn** | Draw a card, then do things in any order: give your free Hearts, put Characters on the Bench, evolve, play one Supporter, use abilities, retreat once. **Attacking ends your turn.** The player who goes first cannot attack in their first turn. |
| **Steps** | The six things of a turn, listed on the left of the battle table: draw a card, give the free Hearts, put Characters on the Bench, evolve, play a Supporter, attack. The ones you can do now glow, and one line under the table says what to do next. |
| **Setup** | Draw 5 cards (a hand with no Basic is drawn again), put one Character in front and up to 3 on the Bench. A coin picks who goes first. |
| **Active** | Your Character in front: it attacks and takes the hits. |
| **Bench** | Up to 3 more Characters, waiting. |
| **HP** | Hit points. At 0 a Character is knocked out. |
| **Memories** | Win points. You get 1 for knocking out a Character, 2 for a Prime. **First to 6 Memories wins.** |
| **Basic, Close, Bride** | The three steps of a sister. A Close card can be played on top of a Basic card of the same sister, a Bride card on a Close card. It keeps Hearts and damage and gets stronger. |
| **Event** | A limited Halloween card. It is played like a Basic card, cannot evolve, and is always a Prime. At most 1 per deck. |
| **Prime** | A stronger card that gives your opponent 2 Memories when it is knocked out. |
| **Weakness / Resistance** | If the attacker's kind is the defender's weakness, damage is doubled. If it is the defender's resistance, damage is 30 lower. |
| **Retreat** | Swap your Active Character with a Benched one by paying its retreat cost in Hearts. Once per turn. |
| **Move** | An attack. It needs the Hearts shown next to it and uses them up. A grey Heart (marked “any” on the table) can be paid with any Heart: the Hearts a Character holds are all of its own kind, so only how many it holds counts. |
| **Ability** | A special power of a Character. "Once per turn" abilities you use yourself, the others work all the time. |
