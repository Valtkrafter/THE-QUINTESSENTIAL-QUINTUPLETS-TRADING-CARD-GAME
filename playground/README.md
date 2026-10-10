# TQQ TCG

A fan-made, offline-first trading card game: open packs, inspect foil cards in 3D, grade them into slabs, build a deck, battle. Vite + React + TypeScript (strict, no `any`) + React Three Fiber. The plan is in `../docs/bauplan.md`, the card rules in `../docs/card-system.md`.

```bash
npm install
npm run dev        # dev server (http://localhost:5173)
npm run check      # typecheck + lint + tests (run this before every commit)
npm run build      # production build
```

Scripts: `typecheck`, `lint` (oxlint), `test` / `test:watch` (Vitest), `check`, `build`, `preview`, `css-types` (see below).

The game lives at `/#/` (binder), `/#/dex`, `/#/showcase`, `/#/settings`, `/#/card/<uid>`. The old holo playground is kept as a dev tool at `/#/lab`.

## Layers

Lower layers never import higher ones (enforced by `src/architecture.test.ts`); game rules never touch React or three.js and never use `Math.random`.

| Folder | Role |
|---|---|
| `src/cards` | Card vocabulary, schema, catalog |
| `src/domain`, `src/packs` | Game rules as pure code: seeded random, save game, collection views, pull weights; later grading, economy, battle |
| `src/state` | The running game and the settings (Zustand), saving to IndexedDB |
| `src/cardface` | Draws a card face on a 2D canvas (frames, text, signatures) and the flat thumbnails |
| `src/holo` | WebGL finishes and shaders |
| `src/scene` | The 3D card view |
| `src/ui` | Screens, components, theme tokens (`src/ui/theme/tokens.css`), all texts (`src/ui/text.ts`) |

Styling is CSS Modules plus the theme variables. `tools/css-module-types.ts` writes `*.module.d.css.ts` next to every stylesheet (git-ignored) so a misspelled class name is a compile error; `npm run typecheck` and `npm run build` run it, and the dev server keeps it current.

## Card art

The art is fan material and stays on this machine (git-ignored). Put the chosen pictures in the art folder (`<Name> Tier NN.jpg`, `<Name> Halloween NN.jpg` per character) and run

```bash
python tools/import-art.py [art-folder]
```

It writes `src/assets/art/<character>/` and `src/data/art-manifest.json`. The old playground art loading (`src/assets/cards/`, drag and drop onto the page) still works for experiments.

## Testing the effects

- `name.mask.png` next to `name.png` in `src/assets/cards/` is a foil mask (white = foil). `back.png` replaces the card back.
- `src/holo/shaders/` holds the GLSL; `cardFront.frag.glsl` has every finish, `common.glsl` the shared helpers.
- `src/holo/finishes.ts` lists finishes and foil regions (indices must match the shader branches).
