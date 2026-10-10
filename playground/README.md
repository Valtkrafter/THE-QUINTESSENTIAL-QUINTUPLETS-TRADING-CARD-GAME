# TQQ Holo Playground

Throwaway spike for the card foil effects: Vite + React + TypeScript + React Three Fiber.

```bash
npm install
npm run dev
```

## Adding art

- Put images in `src/assets/cards/` (png, jpg, webp, avif). They load at start; the folder is git-ignored.
- Or drop files onto the page, or use **Add images…** in the panel.
- `name.mask.png` is the foil mask for `name.png`: white = foil, black = plain print. Use the "Custom mask image" foil region.
- `back.png` replaces the card back.
- Images are cover-fitted to the 63 × 88 mm card shape.

## Layout

- `src/holo/shaders/` — GLSL. `cardFront.frag.glsl` holds every finish; `common.glsl` holds shared helpers.
- `src/holo/finishes.ts` — finish and foil-region catalog (indices must match the shader branches).
- `src/holo/HoloCard.tsx` — card mesh, tilt and spin springs, pointer handling.
- `src/scene/Stage.tsx` — canvas, gallery and inspect layouts, camera fit, FPS and GPU readout.
