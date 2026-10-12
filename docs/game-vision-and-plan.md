# TQQ TCG: vision, principles and implementation plan

Status: **proposal for your review.** Items marked ⚑ are decisions I need from you before I build them. Everything else is a recommendation, not a fact.

## 1. What we are making

A **fan-made, offline-first collector's trading card game** about the Nakano quintuplets and their circle. You open packs, inspect beautiful foil cards, grade your best ones into slabs, fill a binder, build a deck and play short matches against AI opponents.

The feature baseline already exists in your Gemini prototype (the "Grand Binder" screenshot): a large collection with raw and slabbed cards, a Card-Dex with completion count, a Showcase, a Singles Kiosk, Bulk Sell, a yen currency and "Exam Showdown". We keep those loops but rebuild them on the real card system, the real renderer and honest rules.

**One-line pitch:** *The joy of pulling a card, holding it up to the light, and owning it.*

## 2. Game principles

1. **Cards are the product.** Every system exists to make owning and inspecting a card feel good. The visual bar is the one set by audit patches 01 to 09: print-like frames, readable text, convincing foil.
2. **Fair and transparent.** Published drop rates, seeded and replayable pulls, a visible pity counter, no dark patterns. ⚑ **No real-money purchases at all** (my strong recommendation: it keeps the project legal as a free fan work and avoids gambling rules).
3. **Rarity is design, finish is luck.** Rarity belongs to the card, finish to the individual copy. Value is a visible formula: rarity × finish × grade.
4. **Collecting is the progression.** You grow through binder completion, the Card-Dex, grades and showcases, not through stat grinding. Every pull has a use (sell, trade up, grade).
5. **Simple rules, deep decks.** A Pokémon-style core (HP, Hearts, moves, weakness, Prime). Matches around ten minutes. Card effects are data the engine runs, never hard-coded per card.
6. **Offline-first and local ownership.** Saves live on your machine and can be exported. No server in version 1. Online features are optional later.
7. **Runs on modest hardware.** Effects scale down: the Intel integrated GPU is the minimum spec. Reduce-motion setting. English and Japanese text.
8. **Respect the source.** Non-commercial fan project, credits shown, character art stays local and never goes into a public repository. (I am not a lawyer; check the IP position before any public release.)
9. **Deterministic and testable.** Game logic is pure code with seeded randomness; strict TypeScript, zero `any`; every rule has a test.

## 3. The game loops

| Loop | What happens | Why it is fun |
|---|---|---|
| **Moment** (30 s) | Pack tears open, cards reveal one by one, rarity flash, 3D inspect | Anticipation and the "wow" of a foil pull |
| **Session** (15 min) | Earn yen (matches, daily, selling duplicates), buy packs, file cards in the binder, grade a favourite | Steady progress toward a visible goal |
| **Long term** | Complete the Card-Dex, fill slab shelves, perfect a showcase, climb AI difficulty | Mastery and bragging rights |
| **Skill** | Build a deck, play a match, adjust the deck | Choices that matter |

## 4. Systems in plain terms

### Cards (done in the playground)
43 starter cards, 7 rarities (C U R RR AR SAR UR), 7 finishes, four frame styles, bundled fonts, vector signatures, embossed foil on SAR/UR. Next: move the catalog from TypeScript constants to validated data files.

### Packs
Four packs with 5 cards each (built; the numbers are in `docs/packs-und-wirtschaft.md`, in German): the Booster (¥300) is cheap and mostly Commons and Uncommons, the Select (¥1,000) has no Commons and a Rare or better in every pack, the Premium (¥3,000) has an Art Rare or better in every pack and the shiniest finishes, and the Halloween Wish (¥500) is a Booster with a limited-card banner. In every pack the first three cards are plain, one is a bonus card and one is the "hit" slot (Rare or better). Each card then rolls its finish with the tier weights in `packs/finishWeights.ts`, which a pack can lean towards foil. A visible pity counter per pack guarantees an SAR or better, and an UR, after N packs. The top cards cost about the same in every pack, so a dearer pack is faster and shinier, not cheaper. The odds are public: every pack has an Odds page worked out from the same data as the draw.

### Grading
Every owned copy has hidden condition values: centering, corners, edges, surface. Grading reveals sub-grades and an overall 1 to 10 (a fictional grading company, never a real brand). The condition is also *visible on the card*: shifted print for poor centering, edge whitening, surface scratches in the shader. Grading costs yen (paid whatever the score is) and produces a slab. The graders look closer than anybody can and find hidden flaws, so a clean-looking card is the best bet and still no sure thing; only a high score multiplies the value, and a low one makes the card worth less than it was.

### Economy
Yen comes from matches, daily rewards and selling. It leaves through packs, the kiosk and grading fees. A simulator tool checks that a normal player neither floods nor starves. Price = base(rarity) × finish multiplier × grade multiplier.

### Battle-System (draft rules, to be playtested)
Active Character plus a Bench. Each turn you get **one free Heart** (decided: no Heart cards in the deck), you may play one Supporter per turn. Moves cost Hearts, weakness doubles damage, resistance removes 30. Win by collecting 6 Memories (a Prime knocked out gives 2). AI opponents with scripted decks and three difficulty levels. The prototype's "Exam Showdown" is just the old name of this mode: it is called **Battle-System** from now on (decided).

#### Limited Halloween cards (decided: own function, a bit more power)
Every sister has two Halloween cards (a "Treat" and a "Trick"). They are limited, like a limited pull banner: they can only be pulled during the Halloween event (see Packs), not in normal packs.
- They are Event-Prime cards: they can be played straight onto the Bench (no evolution needed), have more HP than a normal Basic, a cheap strong move and a unique effect.
- Price of the power: a Halloween card gives up **2 Memories** when knocked out, and a deck may hold **only 1 copy** of each.
- Draft effects (numbers to be tuned): Ichika Treat "Curtain Call Costume" (once per turn: free retreat + heal 20), Ichika Trick "Black Cat Scratch" (60 damage, discard 1 Heart of the defender), Nino Treat "Sweet Treats" (heal 30 from each of your Characters), Nino Trick "Wicked Bite" (80 damage, heal 30 from itself), Miku Treat "Sengoku Ghost" (your Benched Characters take no damage), Miku Trick "Haunting Melody" (50 damage, the defender cannot attack next turn), Yotsuba Treat "Trick-or-Treat Run" (attach 1 extra Heart this turn), Yotsuba Trick "Pumpkin Dash" (40 damage, draw 2), Itsuki Treat "Candy Feast" (draw until you hold 6 cards), Itsuki Trick "Starving Ghost" (40 damage, discard up to 2 Hearts of the defender).
- Event Banner: a time-limited pack (about 3 weeks around Halloween, date taken from the system clock) with a raised chance for the 10 Halloween cards and its own pity counter (a guaranteed Halloween card within 70 packs). After the event they cannot be pulled; a re-run later is possible.

## 5. Architecture

Layers, with one rule: **upper layers may import lower layers, never the reverse**, and the domain layer never imports React or three.js.

| Layer | Contents | Notes |
|---|---|---|
| `domain/` | cards, instances, packs, grading, economy, battle engine | pure functions, seeded RNG, no UI imports |
| `data/` | card definitions, art manifest, validation (Zod) | data checked when loaded |
| `state/` | save game, settings, session | one store, versioned saves with migrations |
| `render/` | `cardface/` (2D face composer) and `holo/` (shaders, slabs, packs in 3D) | already built in the playground |
| `ui/` | screens: Binder, Dex, Inspect, Pack Opening, Grading, Deck, Battle, Shop | consumes state, never rules |

Key technical decisions:
- **One shared 3D canvas.** Browsers allow about 16 WebGL canvases, so a grid of 1,000 cards must use pre-rendered 2D thumbnails. Only the inspected card, pack reveal and slab use WebGL.
- **Face cache.** Card faces are composed once and cached (thumbnail plus full texture), not rebuilt per view.
- **Event log.** Pulls, grades and sales are recorded as events, so a save can be audited and replayed.
- **Abilities as data.** A small effect vocabulary (draw, heal, search, damage-if, attach) that the engine interprets and the card text is generated from.
- **Tests.** Unit tests for rules and odds, a Monte Carlo odds check in CI, visual snapshot tests of card faces.

## 6. Plan

Sizes: S (a few sessions), M (a week of sessions), L (several weeks), XL (a major project). Every stage ends with something playable, tests, and a green build.

| Stage | Goal | Contents | Size |
|---|---|---|---|
| **0 Foundation** | Make the playground a real project | Apply audit patches 01 to 09; `git init`; CI (typecheck, lint, build); Vitest; folder layout above; update `card-system.md` | S |
| **1 Data and saves** | A trustworthy base | Card schema + Zod validation; catalog as data files; owned-copy model (finish, hidden condition, serial); seeded RNG; versioned save/load | M |
| **2 Binder and inspect** | See what you own | Binder grid (thumbnails), filters and sort, Card-Dex, Showcase, inspect screen with the 3D card, theme | M |
| **3 Pack opening** | The moment | Pack definitions and odds, finish rolls, pity, reveal state machine, skip, results screen, odds simulator | M |
| **4 Economy and shop** | A reason to keep playing | Yen sources and sinks, daily reward, kiosk, bulk sell, price formula, balance simulator | M |
| **5 Grading** | The collector's payoff | Hidden sub-grades, visible wear in the shader, submission and reveal, 3D slab, population report | L |
| **6 Decks and battle** | The game part | Deck builder and legality, effect vocabulary, rules engine, AI, battle screen, Exam Showdown rewards | XL |
| **7 Polish and ship** | Make it an app | Tauri Windows installer, performance tiers (Intel UHD test), audio, EN/JA, accessibility, other-OS check | L |

Suggested order after Stage 0: 1 → 2 → 3 → 4 → 5 → 6 → 7. Stages 2 and 3 give you the pull-and-inspect experience early, which is the part that sells the game to anyone you show it to. Battle is last because it is the biggest and the most likely to change once the collecting loop is playable.

## 7. Risks and how we handle them

| Risk | Handling |
|---|---|
| IP and legal | Free, non-commercial, no real money, credits, art stays local. Check before any public release. |
| Art volume | Starter set uses your own art. Expansion sets need a clear art source; placeholders until then. |
| Performance on integrated GPUs | Test on the Intel UHD early (Stage 0), quality tiers, thumbnails for grids. |
| Battle scope | Keep rules small, effect vocabulary small, AI scripted, no PvP in version 1. |
| Economy balance | Simulate before shipping; keep every number in one table. |
| Fonts and cross-OS | Fonts are bundled (patch 05); still test on another OS before release. |

## 8. Decisions I need from you (⚑)

1. ✅ **No real-money purchases**: answered yes, free forever.
2. ✅ **First platform:** answered web first, desktop (Tauri) afterwards. This changes Stage 7: the browser build is the main target until then.
3. ✅ **Offline single-player first**: answered yes, multiplayer possible in the future. Keep the battle engine pure and deterministic so it can be reused for multiplayer later.
4. **Battle in version 1:** vs AI only, no PvP? (recommended)
5. ✅ **"Exam Showdown"**: answered. It is the old name of the battle mode; we build the Battle-System under that name from now on.
6. **Card pool target** for set 1 (today 43). My suggestion is about 150 cards for a first real release.
7. **Libraries** (still unconfirmed from the first consultation): Zustand for state, Zod for validation, XState for the pack and battle flows, IndexedDB or Tauri SQLite for saves, Vitest and Playwright for tests. Confirm or change.
8. ✅ **UI theme** for the app around the cards: answered calm and visually appealing (not the dark arcade look). Design tokens still to be proposed.
9. **Prism Crystal** (the replacement for Cracked Ice): keep this direction, or try another? Options below.

### Other finish directions, if Prism Crystal is not it
- **Obsidian Mirror:** black chrome that turns the art into mirror-like tones, with spectral edge light.
- **Aurora Veil:** slow curtains of colour that drift across the card, with fine star dust.
- **Diamond Dust:** a dense field of tiny sparkles on a pale pearl base, like frost under a spotlight.
