# TQQ card system (draft v1)

A Pokémon-style structure themed around the Quintuplets. Source of truth for the types: `playground/src/cards/model.ts`; the 43-card starter set: `playground/src/cards/catalog.ts`.

## Card kinds

| Kind | Who | Role |
|---|---|---|
| **Character** | The five sisters | Your fighters. Have HP, moves, an optional ability, weakness, resistance and retreat cost. |
| **Supporter** | Fūtarō, Raiha, Isanari, Maruo, Yūsuke | One per turn. Draw, search, heal, disrupt. |
| *(planned)* Item, Location, Heart | — | Items and Locations are the "Trainer" family; Heart cards are the energy. |

## Hearts (types)

Each sister owns a Heart type; Study is neutral (any Heart can pay a Study cost).

| Heart | Sister | Colour | Weak to | Resists |
|---|---|---|---|---|
| Heart ♥ | Ichika | gold | Butterfly | Star |
| Butterfly | Nino | violet | Melody | Heart |
| Melody 🎧 | Miku | blue | Clover | Butterfly |
| Clover ☘ | Yotsuba | green | Star | Melody |
| Star ★ | Itsuki | coral | Heart | Clover |
| Study 📖 | supporting cast | grey | — | — |

Weakness doubles damage; resistance subtracts 30.

## Stages and Prime

- **Basic → Close → Bride** (like Basic → Stage 1 → Stage 2).
- **Prime** cards are stronger and have more HP, but give up **2 Memories** when knocked out (the "ex" rule).
- Win by collecting **6 Memories** (prize cards).

## Rarity ladder (7 tiers)

| Tier | Code | Name | Sister cards in TQQ01 |
|---|---|---|---|
| 1 | C ● | Common | Basic |
| 2 | U ◆ | Uncommon | Basic |
| 3 | R ★ | Rare | Close |
| 4 | RR ★★ | Double Rare | Close Prime |
| 5 | AR ✦ | Art Rare | Basic, art-focused |
| 6 | SAR ✦✦ | Special Art Rare | Bride Prime, gold signature |
| 7 | UR ✦✦✦ | Ultra Rare | Bride Prime, gold signature |

Art file *n* in each sister's folder is used for tier *n*.

**Finish is independent of rarity**: any printed copy can roll Standard, Rainbow, Sparkle, Cosmos, Gold, Cracked Ice or Radiant. Finish belongs to the owned copy, not the card design.

## Card face layout (our own, Weiß-Schwarz-inspired)

1. Full-bleed artwork, framed per card (`crop`: position + zoom; zoomed-out art gets a blurred fill).
2. Top left: level badge with the Heart glyph and stage, plus a gold **PRIME** pill. Top right: HP and type coin.
3. Gold-foil signature (SAR/UR, invented autographs) just above the text area.
4. Text area anchored to the bottom: name bar (English + Japanese), title and stage, ability, moves, and a footer row (weakness, resistance, retreat, set code, rarity, illustrator).

**Classic** is the chosen direction (modelled on Weiß Schwarz foils): pearl border around full art, white level box (LV 1/2/3 = Basic/Close/Bride) with a Heart colour chip, translucent white text box, name band (HP chip, title, English name, large Japanese name) and an info strip (set code, rarity, 《traits》, weakness/resistance/retreat). All four frames (Classic, Paper, Fade, Glass) stay as in-game variants for variety; which print gets which frame is still to be decided.

Layout rules shared by every frame (`playground/src/cardface/paint.ts`): 40px safe margin from the card edge (face is 1000×1400), 12px gap between panels, 16px corner radius, 24px panel padding. Type scale: rules text 26px, move names 34px, damage 46px, labels 20px, smallest text 18px. An audit over all 43 cards × 4 frames checks for overlapping text, safe-margin violations and undersized fonts.

The foil mask comes from the same layout: red = holo allowed, green = gold signature, blue = text areas, which never take foil in any finish or foil region.

## Open

- Move and ability effects are display text only; a battle engine needs them as structured data.
- Illustrator credits are "Unknown" until the art sources are known.
- The numbers (HP, damage, costs) are first-pass and unbalanced.
