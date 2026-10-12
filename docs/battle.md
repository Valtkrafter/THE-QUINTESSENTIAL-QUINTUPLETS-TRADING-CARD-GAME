# Battle (Stage 4)

How a battle is played, how it is built and how it was tuned. The words are the ones of `glossary.md`.

## The rules in one page

**Decks.** 30 cards, at most 2 copies of a design (1 for the limited Halloween Event cards), at most 6 Prime cards, at least 1 Basic or Event Character (`domain/decks.ts`). A player's own deck may only use cards they own, as often as they own them. Loaner decks and the computer opponents' decks are exempt.

**Setup.** Both players draw 5 cards. A hand without a Basic or Event Character is shown and drawn again. A coin picks who goes first. Everyone puts one Character in front (Active) and up to 3 on the Bench, then says "done".

**A turn.** Draw a card (a player who cannot draw loses). Then, in any order:

- Give your **2 free Hearts** to any of your Characters (one at a time, to the same one or to different ones). A free Heart that is not given is lost. In the very first turn of the battle the player who goes first gets **none** (they cannot attack anyway) and the player who goes second gets **3**.
- Put Basic and Event Characters on the Bench (3 places).
- **Evolve:** put a Close card on a Basic of the same sister, a Bride card on a Close one. Hearts and damage stay. Not in your first turn, not on a Character that came into play this turn, once per Character per turn. Event cards cannot evolve.
- Play **one Supporter**.
- Use a **"once per turn" ability** of any of your Characters.
- **Retreat** once: pay the retreat cost in Hearts (taken off the Active Character) and swap it with a Benched one.
- **Attack** with the Active Character: it needs the Hearts of the move (a Bench ability can take grey Hearts off), and **the move uses them up**: they are taken off the Character when it attacks. Attacking ends the turn. The player who goes first cannot attack in their first turn.

**Damage.** Printed damage, plus "+" or "×" bonuses from the board (a move that does "+30 for every Heart" counts the Hearts the Character holds as it attacks, before the move uses its own up). Then the defender: weakness doubles, resistance takes off 30, an ability may take off more, a shield stops everything. A move that does no damage still ends the turn and still uses up its Hearts.

**Knock-outs.** At 0 HP a Character is knocked out and its whole pile goes to the discard pile. The opponent gets 1 Memory (2 for a Prime). The player whose Character fell steps up a Benched one (their choice). **First to 6 Memories wins.** A player with no Character left in play loses, a player who cannot draw loses, after 80 turns the player with more Memories wins, and anybody may give up.

**Effects.** Every effect is data on the card (`cards/schema.ts`); `battle/effects.ts` runs them. Effects that need a decision ("heal which Character", "take which card") ask the player. If only one answer is possible it is taken automatically.

## Why these numbers

Tuned with the computer opponents playing each other (`battle/balance.test.ts`, run `SIM=1 npx vitest run src/battle/balance --reporter=verbose`):

- **Hearts:** a move uses up its Hearts, so the free Hearts of a turn have to pay for the attacks. With **1** free Heart a turn a Character with a three-Heart move could attack only every third turn and 9 battles in 10 ended because somebody could not draw; with **3** battles were over after 11 turns of both players together. **2** a turn gives the pace the battles had when the Hearts stayed on the Characters: an attack in 56% of the turns, 75 damage a turn, a move costs 2.4 Hearts on average. A three-Heart move can be made in two turns of three, so a small move that keeps enough Hearts for the big one next turn is a real choice (the computer opponents look at this turn and the next).
- **Battle length:** median 21 turns of both players together (10 or 11 each), 90% under 28, and 16% over by turn 6 (the numbers with the Hearts staying: 20, 26 and 12%; the design asks for about 10 minutes). Of 2,500 battles 40% ended because somebody could not draw, 31% on Memories and 30% because one side ran out of Characters.
- **First player:** with the same Hearts for both players the player who goes first won 53 to 57%. Giving the second player more Hearts in the first turn does little now (4 instead of 2 left the first player at 55%), because the Hearts are used up; what counts is what the first player gets: **no free Hearts in their first turn** (they cannot attack then anyway) and **3** for the player who goes second brings it to **49%** (500 battles for each of six pairs of levels). An extra card for the second player did nothing.
- **Levels:** easy loses about 64% against normal and 78% against hard; normal loses about 69% against hard (measured with `SIM=1`, mirror decks). Normal plays a random action in about one decision in eight and picks a random move in one attack in five; hard never does and also looks ahead at what the enemy could do next turn. The harder rivals also get better decks.
- **Weakness and resistance** are strong: a single-sister deck against the sister it is weak to wins 5 to 20% of the time. Mixed decks and the choice of deck are the answer; if it feels too harsh, the numbers are `WEAKNESS_FACTOR` and `RESISTANCE_REDUCTION` in `battle/rules.ts`.

## How it is built (`playground/src/battle`)

| File | Job |
|---|---|
| `types.ts` | The state, the actions, the events: plain data, nothing about screens |
| `rules.ts` | Numbers and calculations (damage, costs, Memories) that the engine, the AI and the screens share |
| `legal.ts` | `legalActions`: everything a player may do now. The single truth about a turn |
| `engine.ts` | `createBattle`, `step(state, action)` gives the new state and the events |
| `effects.ts`, `ops.ts` | The card effects and the small board operations (draw, heal, swap, ...) |
| `observe.ts` | The battle as one player may see it (decks and the other hand hidden) |
| `ai.ts`, `aiEval.ts` | The computer opponents: easy, normal, hard |
| `simulate.ts` | Plays computer against computer, for the tests and the balance report |
| `describe.ts` | Events as plain sentences (the battle log) |
| `testing.ts` | Helpers for tests: hand-made states, random battles, invariants |

A battle is repeatable: the same decks, the same seed and the same actions always give the same result. `step` never changes the state it is given.

## How a player learns it

The rules above are taught three ways, and all three have to say what the engine does:

- **The table itself** (`ui/battle/coach.ts`): the six steps of a turn on the left of the table, each marked done, ready or not now, and one sentence under the table. They are worked out from the state and `legalActions`, so they can only suggest what the rules allow. See `docs/ui.md`.
- **The "How to play" window** (`text.battle.howToPlay` in `ui/text.ts`): the rules in plain words.
- **The animated explanation** (`playground/public/battle-demo.html`): one turn, damage and weakness, Prime cards, a Halloween card and a victory, played with the real numbers of real cards (Nino, Ichika, Itsuki, Fūtarō; 30-card decks, at most 2 copies, 6 Memories, weakness ×2, resistance −30, a Prime gives 2 Memories, for example a Close with 110 HP, a Bride with 150 HP, a Prime with 190 HP and a Halloween card with 130 HP). When one of those rules or cards changes, the page needs the same change.
