# TQQ TCG

A fan-made, offline-first trading card game: open packs, inspect foil cards in 3D, grade them into slabs, build a deck, battle. Vite + React + TypeScript (strict, no `any`) + React Three Fiber. The plan is in `../docs/bauplan.md`, the card rules in `../docs/card-system.md`.

```bash
npm install
npm run dev        # dev server (http://localhost:5173)
npm run check      # typecheck + lint + tests (run this before every commit)
npm run build      # production build
npm run test:e2e   # the game played in a real browser (see "End-to-end tests")
```

Scripts: `typecheck`, `lint` (oxlint), `test` / `test:watch` (Vitest), `test:e2e` (Playwright), `check`, `build`, `preview`, `css-types` (see below).

The game lives at `/#/` (binder), `/#/packs`, `/#/shop`, `/#/grading`, `/#/battle`, `/#/decks`, `/#/dex`, `/#/showcase`, `/#/settings`, `/#/card/<uid>`. The old holo playground is kept as a dev tool at `/#/lab`.

## Layers

Lower layers never import higher ones (enforced by `src/architecture.test.ts`); game rules never touch React or three.js and never use `Math.random`.

| Folder | Role |
|---|---|
| `src/cards` | Card vocabulary, schema, catalog |
| `src/domain`, `src/packs` | Game rules as pure code: seeded random, save game, collection views, deck rules, pull weights; later grading and economy |
| `src/battle` | The battle: rules engine, card effects, computer opponents, simulator, ready-made decks (see `docs/battle.md`) |
| `src/state` | The running game and the settings (Zustand), saving to IndexedDB |
| `src/cardface` | Draws a card face on a 2D canvas (frames, text, signatures) and the flat thumbnails |
| `src/holo` | WebGL finishes and shaders, and the one shared renderer that puts them on every card of a grid (`tileRenderer.ts`) |
| `src/scene` | The 3D card view |
| `src/ui` | Screens, components, theme tokens (`src/ui/theme/tokens.css`), all texts (`src/ui/text.ts`) |

Styling is CSS Modules plus the theme variables. `tools/css-module-types.ts` writes `*.module.d.css.ts` next to every stylesheet (git-ignored) so a misspelled class name is a compile error; `npm run typecheck` and `npm run build` run it, and the dev server keeps it current.

## The Windows app

`npm run desktop:build` wraps the game in a native window with Tauri and makes a Windows installer (`src-tauri/target/release/bundle/nsis/`). It needs Rust and the Visual Studio C++ build tools. See `../docs/desktop.md`.

## End-to-end tests

`e2e/` holds Playwright tests that play the game in a real browser against the production build (`npm run test:e2e` builds it, starts `vite preview` on port 4173 and runs everything): every screen of the menu, a pack, a card in 3D, a card graded into a slab and sold, a battle that is given up, the screens on a phone (no sideways scrolling, press and hold shows a card large) and an accessibility check with axe-core on every screen (serious and critical problems fail the test). Every test starts with a new browser profile, so a new game; your own saves are never touched.

The tests use the Google Chrome installed on the machine, so nothing is downloaded. `TQQ_BROWSER=msedge` uses Microsoft Edge; `TQQ_BROWSER=chromium` uses Playwright's own browser (run `npx playwright install chromium` once, for example on a build server). A failed test leaves a trace in `test-results/` (`npx playwright show-trace <file>`).

## Card art

The art is fan material. It is committed (`src/assets/art/`), so it is public together with the repository and is served by the deployed game. To change it, put the chosen pictures in the art folder (`<Name> Tier NN.jpg`, `<Name> Halloween NN.jpg` per character) and run

```bash
python tools/import-art.py [art-folder]
```

It writes `src/assets/art/<character>/` and `src/data/art-manifest.json`. The old playground art loading (`src/assets/cards/`, drag and drop onto the page) still works for experiments.

## Testing the effects

- `name.mask.png` next to `name.png` in `src/assets/cards/` is a foil mask (white = foil). `back.png` replaces the card back.
- `src/holo/shaders/` holds the GLSL; `cardFront.frag.glsl` has every finish, `common.glsl` the shared helpers.
- `src/holo/finishes.ts` lists finishes and foil regions (indices must match the shader branches).
