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
| **Pack** | 5 cards for ¥500. Opening one is the big moment. |
| **Banner / Wish** | A time-limited pack with its own cards (Halloween Wish). Some of its cards are *featured* (50/50, then sure). |
| **Rarity** | How rare a design is: Common, Uncommon, Rare, Double Rare, Art Rare, Special Art Rare, Ultra Rare (C, U, R, RR, AR, SAR, UR). |
| **Finish** | How one printed copy shines: Standard, Rainbow Holo, Sparkle, Cosmos, Gold Foil, Prism Crystal, Radiant. Luck, not design. |
| **Binder** | All your cards. **Card Dex** shows how many of the 79 designs you have found. **Showcase** shows your six favorites. |
| **Guarantee** | A card that is sure to come after a number of packs without one. |
| **Grading** | Later: send a card in and get a score from 1 to 10 in a sealed case. |

## Fighting

| Word | What it means |
|---|---|
| **Character** | A card of one of the sisters. It has HP, moves and sometimes an ability. |
| **Supporter** | A card of someone around the sisters. Play one per turn: draw, heal, search, disrupt. |
| **Heart** | The energy that pays for moves. You get one free Heart each turn and give it to one of your Characters (the player who goes second gets two in their first turn). A Heart always has the kind of the Character that holds it. |
| **Turn** | Draw a card, then do things in any order: give your free Heart, put Characters on the Bench, evolve, play one Supporter, use abilities, retreat once. **Attacking ends your turn.** The player who goes first cannot attack in their first turn. |
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
| **Move** | An attack. It needs the Hearts shown next to it. The grey Heart can be paid with any Heart. |
| **Ability** | A special power of a Character. "Once per turn" abilities you use yourself, the others work all the time. |
