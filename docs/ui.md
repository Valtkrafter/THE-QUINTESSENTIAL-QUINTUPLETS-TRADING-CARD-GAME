# UI structure (Stage 2)

## Screens

| Route | Screen | What it does |
|---|---|---|
| `#/` | Binder (`ui/binder`) | Every owned copy as a flat picture; search, filter (character, rarity, finish), sort (number, rarity, finish, newest) |
| `#/dex` | Card-Dex (`ui/dex`) | All 79 designs, owned ones in colour, missing ones dim; progress overall and per character |
| `#/card/<uid>` | Inspect (`ui/inspect`) | One copy in 3D (drag to turn, double-click to flip), facts, showcase toggle, arrow keys to the neighbours |
| `#/showcase` | Showcase (`ui/showcase`) | Up to 6 copies on display; picker dialog |
| `#/settings` | Settings (`ui/settings`) | Frame style, graphics level, idle motion, save export/import/reset, development grants (dev build only) |
| `#/lab` | Holo Lab (`ui/lab`) | The old playground, kept as a dev tool |

Routing is hash-based (`wouter/use-hash-location`), so the game also works from a static host or inside Tauri without server rules. The two 3D screens are loaded on demand, so the binder starts without three.js.

## Why thumbnails

A binder with 80 cards cannot run 80 WebGL views. Each card face is painted once with the same 2D code as the 3D card (`cardface/thumbnails.ts`), shrunk to 360×504, kept as a WebP and shown as an `<img>`. Painting is queued and starts only when a tile comes near the screen. A CSS layer per finish (`ui/components/CardFace.module.css`) hints at the foil while the pointer moves over a tile; the real shader runs only in the inspect view. WebP is used because JPEG encoding was about 25 times slower in the browser pane (1 s against 40 ms per card).

## State

- `state/gameStore.ts`: the save in memory, loading, writing (latest change wins, failures are reported), damaged-save handling, fallback to memory when the browser refuses storage.
- `state/preferences.ts`: per-device settings (frame style, graphics, idle motion), separate from the save so an exported save does not carry them.
- `state/app.ts`: the one game and the one set of preferences of the page, plus `useGame` / `useSave` / `usePreferences`.
- Save version 2 added the showcase (`domain/save.ts`, migration 1 → 2, tested).

## Theme "Dämmerung"

All colours, spacing, corners, shadows, type sizes and motion are variables in `ui/theme/tokens.css`; nothing else holds a value. Surfaces are a calm blue-grey, actions use a soft periwinkle, a warm horizon peach is used sparingly, and each Heart type has a pastel (`--affinity-heart` ... `--affinity-study`). Change a value there and every screen follows.

## Text

Every sentence is in `ui/text.ts` (German for now). Card names, rarities and finish names stay English like the cards. Stage 7 turns the file into German / English / Japanese.
