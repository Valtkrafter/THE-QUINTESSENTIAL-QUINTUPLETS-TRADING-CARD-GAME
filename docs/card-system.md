# TQQ card system (v2)

A Pokémon-style structure themed around the Quintuplets. Set code **TQQ01**, **79 cards**. Source of truth in code: `playground/src/cards/model.ts` (types) and, from Stage 1 on, the card data files. The Battle-System rules are summarised in `docs/game-vision-and-plan.md`, the build plan is `docs/bauplan.md`.

## Card kinds

| Kind | Who | Role |
|---|---|---|
| **Character** | The five sisters | Your fighters: HP, moves, optional ability, weakness, resistance, retreat cost. |
| **Supporter** | Fūtarō, Raiha, Isanari, Maruo, Yusuke | One per turn: draw, search, heal, disrupt. |
| **Event Prime** | Two Halloween cards per sister | Limited, see below. |

## Hearts (types)

Each sister owns a Heart type; Study is neutral (any Heart can pay a Study cost). Every turn you get **2 free Hearts** (of the type of the Character you give them to), there are no Heart cards. A move uses up its Hearts.

| Heart | Sister | Colour | Weak to | Resists |
|---|---|---|---|---|
| Heart | Ichika | gold | Butterfly | Star |
| Butterfly | Nino | violet | Melody | Heart |
| Melody | Miku | blue | Clover | Butterfly |
| Clover | Yotsuba | green | Star | Melody |
| Star | Itsuki | coral | Heart | Clover |
| Study | supporting cast | grey | none | none |

Weakness doubles damage, resistance subtracts 30.

## The ten tiers of a sister (art themes and card values)

Every sister has the same ladder. Each tier has its own art theme, so no two cards of one sister feel alike. Rarity and play stage are a *draft mapping*; it is plain data from Stage 1 on and can change without touching code.

| Tier | Art theme | Rarity | Stage |
|---|---|---|---|
| 01 | School uniform | C | Basic |
| 02 | Cozy at home | C | Basic |
| 03 | Signature hobby | U | Basic |
| 04 | Autumn / winter outfit | U | Close |
| 05 | Festival / yukata | R | Close |
| 06 | Bridal portrait | R | Bride |
| 07 | Dress-up | RR | Close, Prime |
| 08 | Full-art illustration | AR | Basic (special art) |
| 09 | Wedding scene | SAR | Bride, Prime |
| 10 | Wedding gown, full look | UR | Bride, Prime |
| H1, H2 | Halloween | Event | Event Prime |

HP guide: Basic 70, Close 110 (Prime 190), Bride 150 (Prime 260). Supporters: Fūtarō 6 cards, Raiha 4, Isanari 3, Maruo 3, Yusuke 3.

## Halloween cards

Limited, only in the time-limited Halloween Banner (own pity counter). Own effect, more HP, can be played straight to the Bench, give up 2 Memories when knocked out, at most 1 per deck. Draft effects are listed in `docs/game-vision-and-plan.md`.

## Rarity and finish

Rarity ladder: C, U, R, RR, AR, SAR, UR (vector marks on the card). **Finish is independent of rarity** and belongs to the owned copy: Standard, Rainbow Holo, Sparkle, Cosmos, Gold Foil, Prism Crystal, Radiant. `playground/src/packs/finishWeights.ts` makes premium finishes more likely on higher rarities (placeholder odds, Monte Carlo tested). SAR and UR also get an embossed foil layer.

## Card face (own design, Weiß-Schwarz-inspired)

Card face is 1000 × 1400, drawn on a 2D canvas, then used as the texture of the WebGL card.

- **Frame styles:** Classic (default, pearl border, white level box, translucent text box, name band, info strip), Paper, Fade (silver), Glass. All four stay as in-game variants.
- **Two fixed print templates:** A for Characters (text area at y = 920, stats pinned to the bottom), B for Supporters (shorter box, larger centred effect text). Text areas never move; long text shrinks stepwise (`SCALE_STEPS`).
- **Rules shared by every frame:** 40 px safe margin, 12 px gap, 16 px radius, 24 px padding, flat print (no blur shadows except the Glass glow), type tokens in `cardface/paint.ts`. Gold is reserved for signatures and Ichika's Heart colour; PRIME is an obsidian ribbon.
- **Fonts:** Inter Variable and Noto Sans JP Variable, bundled and loaded before drawing.
- **Signatures:** invented autographs as vector paths (`tools/generate-signatures.py`), drawn with a slanted nib, gold foil on SAR/UR.
- **Foil mask:** red = holo allowed, green = gold signature, blue = text areas, which never take foil.

## Art

The pictures are fan art. They are committed so the deployed game can show them, which makes them public together with the repository. `playground/tools/import-art.py` copies the chosen pictures from the art folder into `src/assets/art/<character>/<slot>.jpg` and writes `src/data/art-manifest.json` (sizes and source file names). Cast pictures that were small were upscaled with Real-ESRGAN first. Illustrator credits are still "Unknown".

## Open

- Move and ability effects are display text only; the battle engine needs them as structured data (Stage 1 and 6).
- All numbers (HP, damage, costs, odds) are first-pass and unbalanced; they get tuned with simulations.
- Which print gets which frame style is not decided yet.
