# UI structure (Stage 2)

## Screens

| Route | Screen | What it does |
|---|---|---|
| `#/` | Binder (`ui/binder`) | Every owned copy as a flat picture; search, filter (character, rarity, finish, graded or not), sort (number, rarity, finish, newest, score); a graded copy carries its score and a ring in the colour of its band |
| `#/grading` | Grading (`ui/grading`) | Send a loose card in (the fee and the price ladder first, then the reveal) and look at your slabs and your scores; see "Grading" below |
| `#/battle` | Battle (`ui/battle`) | The lobby (pick a rival and a deck) and, once a battle starts, the table; see "Battle" below |
| `#/decks`, `#/decks/new`, `#/decks/<id>`, `#/decks/template/<id>` | Decks (`ui/decks`) | The player's decks and the loaner decks; the deck builder |
| `#/shop` | Shop (`ui/shop`) | The Kiosk (eight single cards a day) and the buyer of spare cards; see `docs/packs-und-wirtschaft.md` section 8 |
| `#/packs` | Packs (`ui/packs`) | Normales Pack und Halloween-Banner, Garantie-Balken, 1 oder 5 Packs öffnen, Tagesbonus, letzte Packs |
| `#/packs/odds` | Quoten (`ui/packs`) | Alle Tabellen, Garantien und Banner-Regeln, aus denselben Daten wie die Ziehung erzeugt |
| `#/dex` | Card-Dex (`ui/dex`) | All 79 designs, owned ones in colour, missing ones dim; progress overall and per character |
| `#/card/<uid>` | Inspect (`ui/inspect`) | One copy in 3D (drag to turn, double-click to flip) with the wear of its hidden marks, facts, showcase toggle, arrow keys to the neighbours; a loose copy has a "Grade it" button, a graded copy sits in its 3D slab and shows its score, marks and value, with "Sell slab" |
| `#/showcase` | Showcase (`ui/showcase`) | Up to 6 copies on display; picker dialog |
| `#/settings` | Settings (`ui/settings`) | Frame style, graphics level, idle motion, save export/import/reset, development grants (dev build only) |
| `#/lab` | Holo Lab (`ui/lab`) | The old playground, kept as a dev tool |

Routing is hash-based (`wouter/use-hash-location`), so the game also works from a static host or inside Tauri without server rules. The two 3D screens are loaded on demand, so the binder starts without three.js.

## Why thumbnails

A binder with 80 cards cannot run 80 WebGL views. Each card face is painted once with the same 2D code as the 3D card (`cardface/thumbnails.ts`), shrunk to 360×504, kept as a WebP and shown as an `<img>`. Painting is queued and starts only when a tile comes near the screen. WebP is used because JPEG encoding was about 25 times slower in the browser pane (1 s against 40 ms per card). Next to the picture the thumbnail keeps two foil masks: a small alpha mask for a CSS shimmer (`ui/components/CardFace.module.css`, the fallback) and the raw mask the shader reads.

## Live foil tiles

Cards with a finish run the real foil shader of the 3D card, in every grid (binder, Card-Dex, showcase). `holo/tileRenderer.ts` owns ONE hidden WebGL renderer for the whole page: every frame it draws the cards that are on screen with `createFrontShader()` (the same shader and the same tilt and light maths as the inspect view, see `holo/tileMath.ts`) and copies each picture into that card's own 2D canvas. The page then clips, scrolls and stacks the cards like any other element, and the number of WebGL views stays at one. `ui/hooks/useHoloTile.ts` connects a `CardFace` to it (visibility through an `IntersectionObserver`, pointer tilt, canvas size) and loads the renderer on demand, so the binder still starts without three.js and shows flat pictures first.

- Only visible cards cost anything. Cards that nobody touches are redrawn about 40 times a second (24 on "normal" graphics, once for a still card), the card under the pointer in every frame; at most 10 pictures per frame, and when frames get slow the idle cards are redrawn less often. A card that was off screen for 4 s gives its textures back, after 20 s its canvas; with no card left the renderer is thrown away after 15 s.
- The CSS shimmer stays as the fallback: low graphics, no WebGL, a graphics chip reset, or a picture that has not been drawn yet. `CardFace` gets `live={false}` where a picture must stay flat (inside the pack show, the poster under the inspect view).
- The plain finish stays a flat picture with the CSS light show on hover: it has no foil to draw.
- Development check: in the browser, `await import(<url of tileRenderer in the Network list>)` then `holoTileStats()` gives cards served, pictures drawn and the time spent drawing.

## Battle (Stage 4)

`ui/battle/Lobby.tsx` lists the five rivals (portrait, level, the type they play and what it is weak to, what a win pays) and the decks the player can take: their own (a deck that is not ready says why) and the loaner decks. `Board.tsx` is the table: the rival on top, the player below, the hand under that, a side panel with the card under the pointer enlarged and the battle log. Sizes follow the window height (`--active-h`) so the table fits one screen. Clicking a hand card or a Character selects it and the buttons for what it can do appear in the strip in the middle (give the free Heart, use the ability, retreat, play the Supporter, end the turn); the moves of the Active Character are buttons next to it with what they would really do to the enemy. A Basic goes to the Bench with one click. Questions of the engine are answered on the table (the possible targets glow) or, for cards, in a sheet. The pure parts are tested: `viewModel.ts` (what can be done with a card or a Character), `floaters.ts` (the floating numbers), `choices.ts` (which decks can be taken).

`state/battleSession.ts` runs the battle: it holds the engine's state and the log, lets the rival act one action at a time with a short pause, does the rival's setup at once and writes the result into the save game when the battle ends (`battle/rewards.ts`). A battle is not saved: closing the page ends it. In the development server `window.__battle` gives the session, the roster and a few helpers for looking at a situation in the console.

## Decks (Stage 4)

`ui/decks/DecksScreen.tsx` lists the player's decks (edit, copy, delete) and the loaner decks (use as a template). `DeckEditor.tsx` is the deck builder: the player's cards on the left (search, characters or supporters; a card that cannot be added says why on hover), the deck on the right with one row per design and minus and plus, the rules check in plain words, and the card under the pointer enlarged. A template keeps the cards the player does not own and marks them. Decks may be saved unfinished. The rules of changing a deck are pure and tested (`editing.ts`).

## Grading (Stage 6)

**The rules** are pure code in `domain/grading.ts`: the score of a copy is the average of its four hidden marks (rolled when the copy was printed, see `domain/ownership.ts`) rounded down to half a point, and 9.75 or more is a 10; the fee depends on the rarity; the value is the price of the card times what the score adds (`gradeMultiplier`); `submitForGrading`, `sellSlab`, `populationReport` and `gradeLadder` (what a card is worth at every score) are all tested. The numbers are in `docs/packs-und-wirtschaft.md` section 9.

**The wear** is what makes the marks visible before a card is graded. `holo/shaders/cardFront.frag.glsl` takes four wear values (`holo/wear.ts` turns a mark into 0 for a perfect one and 1 for the worst): an off-centre print (a white strip on one side), whitened corners and edges, scratches that flash when the light slides along them, and a dull haze. `wearSeed` (from the copy's uid) makes every worn copy wear differently. The inspect view uses it; grids stay clean.

**The slab** is built in `holo/slabShape.ts` and `holo/Slab.tsx` as a child of the card, so it turns, tilts and flips with it: a dark insert with a window for the card, the paper label above it (`holo/slabLabel.ts` paints it on a 2D canvas: logo, name, the four marks and the score in a box, in three palettes: gold for a 10, silver for 9 to 9.5, paper for the rest) and a shell of clear plastic (`shaders/slab.frag.glsl`: a faint tint, a glow along the edges, a glint of the light, a soft reflection that slides over it). No glass and no environment map, so it costs one cheap pass on every graphics card. Without WebGL the flat `ui/grading/SlabFlat.tsx` shows the same label over the card.

**The screens.** `GradingScreen.tsx` has two tabs. "Send a card" lists the loose cards (search and sort); on a wide screen a side panel shows the chosen card, the fee and the price ladder (`PriceLadder.tsx`), on a narrow one a tap opens the question at once. `GradeFlow.tsx` is that question (also opened from the inspect view): the ladder, the fee, "Yes, send it in". The save is written first, then `Ceremony.tsx` plays the reveal: the card is checked, the four marks appear one by one with a bell for each, the score is stamped (a 10 gets golden rays and sparkles, a 9.5 sparkles), and the card slides into its case. It can be skipped at any moment (click, Space, Enter, Escape or the button) and it shows everything at once for people who asked their system for reduced motion. "Your slabs" shows the population report (how many slabs have each score), the total value and every slab, best first.

## State

- `state/gameStore.ts`: the save in memory, loading, writing (latest change wins, failures are reported), damaged-save handling, fallback to memory when the browser refuses storage.
- `state/preferences.ts`: per-device settings (frame style, graphics, idle motion), separate from the save so an exported save does not carry them.
- `state/app.ts`: the one game and the one set of preferences of the page, plus `useGame` / `useSave` / `usePreferences`.
- Save version 2 added the showcase, version 3 the daily bonus, the pack history and the guarantee memories (`domain/save.ts`, migrations tested).

## Theme "Dämmerung"

All colours, spacing, corners, shadows, type sizes and motion are variables in `ui/theme/tokens.css`; nothing else holds a value. Surfaces are a calm blue-grey, actions use a soft periwinkle, a warm horizon peach is used sparingly, and each Heart type has a pastel (`--affinity-heart` ... `--affinity-study`). Change a value there and every screen follows.

## Text

Every sentence is in `ui/text.ts`, in English and in plain words (the game words are listed in `docs/glossary.md`); the names of the rarities, finishes and stages live next to their data. The language of numbers and dates is one constant in `ui/locale.ts`.

## The pull show (Stage 3)

- `scene/pull/director.ts` is the timeline as pure code (phases intro, flight, impact, ceremony, enter, flip, show, exit, summary; modes full, short, off). `runner.ts` plays it and tells the scene (every frame), the screen (on phase changes) and the sound (events).
- The cinematic before the cards is modelled on a gacha reference (Wuthering Waves), rebuilt from scratch in shaders, nothing ripped: the camera falls into a storm (`storm.frag.glsl`), a needle of light with a long trail dives into a gate, a dark hole ringed by turbulent clouds in the colour of the best card (`gate.frag.glsl`), with speed lines and thin orbits (`streaks.frag.glsl`), then a radial-blur dive and a white-out with a cross-star and veins (`burst.frag.glsl`). Art Rare and better then get a ceremony on a black screen (`ceremony.frag.glsl`): a thin line, a jagged spike and three, four or five stars that light up one by one (the five stars of an Ultra Rare wear the Heart colours). Packs with a Special Art Rare or Ultra Rare also weave the five Heart-coloured threads round the needle, which hangs for a moment before it plunges.
- `scene/pull/fx/PullFx.ts` owns everything that glows (storm, needle, trail, threads, gate, white-out, ceremony, shock waves, rays, particles). The background goes through a bloom, a radial blur and colour fringes (`useGlowCompositor.ts`, `composite.frag.glsl`); the card scene is drawn on top without it, so the card looks exactly like in the inspect view. Every shader is compiled before the show starts, and a show that runs too slowly draws its background at a smaller size (`speedMeter.ts`).
- `audio/pullAudio.ts` makes the sound with Tone.js (no sound files). It is loaded when the first pack is opened.
- Development helpers (only in the dev server): Settings > Entwicklung has "Animation ansehen" (plays the show with made-up cards for any best rarity), the pack simulator and money buttons. In the browser console `window.__pullRunner` is the running show; setting `window.__pullFreeze = true` stops time and `window.__pullAdvance = seconds` steps it, for looking at single frames.
