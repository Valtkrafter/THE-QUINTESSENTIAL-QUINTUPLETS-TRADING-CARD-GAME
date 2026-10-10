# Card data and save game

## Where the cards live

One JSON file per character in `playground/src/data/cards/` (`ichika.json` ... `yusuke.json`), 79 cards in total. The game checks every card at start-up with the Zod schema in `playground/src/cards/schema.ts`; a typo, an unknown effect or a wrong id stops the game with a message that lists every problem. The tests do the same on every `npm run check`.

To add or change a card: edit the JSON (ids and numbers stay `TQQ01-001` ... in print order with no gaps), make sure the picture exists in `src/data/art-manifest.json` (run `python tools/import-art.py`), then run `npm run check`.

## A card

Common fields: `id`, `set`, `number`, `rarity` (C U R RR AR SAR UR), `kind` (`character` or `supporter`), `character`, `name {en, ja}`, `title`, `art {character, slot}` (slot `t01`..`t10` for tiers, `h1`/`h2` for Halloween), `signed`, optional `crop {x, y, zoom}` (0..1, `y` 1 = show the bottom of the picture).

- **Character:** `stage` (`basic`, `close`, `bride`, `event`), `prime`, `hp`, `affinity`, `moves`, optional `ability`, `weakness`, `resistance`, `retreat`, and `limited {eventId, maxPerDeck}` for exactly the event cards.
- **Move:** `name`, `cost` (Hearts, `study` is paid by any Heart), `damage` (or `null`), optional `damageSuffix` (`+` or `×`), `text` (as printed), `effects`.
- **Ability:** `name`, `timing` (`passive`, `onceDuringTurn`, `onPlay`), `text`, `effects`.
- **Supporter:** `text` (as printed) and `effects`.

The printed text and the effects describe the same rule; a test checks that a card never has one without the other.

## Effect vocabulary

A card can only do what is on this list (Stage 6 builds the engine that runs it). Passive rules are effects too.

| Effect | Meaning |
|---|---|
| `draw {count}`, `drawUntilHandSize {size}` | draw cards |
| `peekTopMayBottom {count}`, `lookTopTakeOne {count}` | look at the top of the deck |
| `searchBasicToBench {count}`, `searchSupporter {count}` | search the deck |
| `shuffleHandDraw`, `bothShuffleHandDraw`, `opponentShuffleHandDraw {count}` | shuffle hands into decks and draw |
| `heal {amount, target}` | target: `self`, `chosenOwn`, `allOwn`, `allBenched` |
| `attachHeart {count, target}` | target: `self`, `chosenOwn`, `chosenBenched`, `splitAnyOwn` |
| `switchOwnActive {free}`, `forceOpponentSwitch` | swap Active and Bench |
| `discardHearts {count, target: defender}` | remove Hearts from the defender |
| `preventAttackNextTurn`, `shieldActiveNextTurn` | timed protection / stun |
| `coinFlip {heads, tails}` | run other effects after a coin flip |
| `damagePerHeart {amount}`, `damagePerCount {amount, count}` | extra damage (`count`: `ownSisters`, `ownBenched`) |
| `reduceDamageTaken {amount}`, `preventBenchDamage`, `coinSurvive {hp}`, `reduceStudyCost {amount, scope: bench}` | passive rules |

## Card text in other languages

The JSON files in `src/data/cards/` hold the rules and the original English text. The words printed on a card (title, move names, ability names and the rule texts) come from a text file per language, `src/data/cards.de.json` for German, keyed by card id. `cards/texts.ts` lays it over the cards once at start-up (`CATALOG` is the German cards, `CATALOG_ORIGINAL` the English ones). A text file must fit its cards exactly (same number of moves, a rule text exactly where the card has one); a mismatch stops the game at start-up with a list of every problem, and `cards/texts.test.ts` checks all 79 cards. The names of the rarities, finishes, stages and Hearts are translated where they are defined (`cards/model.ts`, `holo/finishes.ts`, `cards/characters.ts`), the words themselves are listed in `docs/wortschatz.md`. The illustrator credit defaults to "Unbekannt".

## Owned copies and the save game

A card you own is a printed copy (`domain/ownership.ts`): `uid`, `cardId`, `finish`, a hidden `condition` (centering, corners, edges, surface, 1.0 to 10.0), `serial` (the n-th copy of that design you received), where and when it was obtained, and `grade` (empty until graded).

The save game (`domain/save.ts`) holds the yen, the collection, counters (next uid, prints per design, packs opened, pity per pack kind) and the state of the seeded random generator, so pulls continue the same way after a reload. It is stored as one text value with a format tag and a checksum, the same text an exported save file contains. Loading checks the checksum, the version (a newer save is refused, older ones are upgraded step by step in `MIGRATIONS`), the schema, unknown card ids and duplicate copies. `state/saveStore.ts` keeps it in IndexedDB; tests use an in-memory store.
