# UI structure (Stage 2)

## Screens

| Route | Screen | What it does |
|---|---|---|
| `#/` | Binder (`ui/binder`) | Every owned copy as a flat picture; search, filter (character, rarity, finish), sort (number, rarity, finish, newest) |
| `#/packs` | Packs (`ui/packs`) | Normales Pack und Halloween-Banner, Garantie-Balken, 1 oder 5 Packs öffnen, Tagesbonus, letzte Packs |
| `#/packs/odds` | Quoten (`ui/packs`) | Alle Tabellen, Garantien und Banner-Regeln, aus denselben Daten wie die Ziehung erzeugt |
| `#/dex` | Card-Dex (`ui/dex`) | All 79 designs, owned ones in colour, missing ones dim; progress overall and per character |
| `#/card/<uid>` | Inspect (`ui/inspect`) | One copy in 3D (drag to turn, double-click to flip), facts, showcase toggle, arrow keys to the neighbours |
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
