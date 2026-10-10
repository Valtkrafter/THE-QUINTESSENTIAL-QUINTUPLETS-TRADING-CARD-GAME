# The Quintessential Quintuplets Trading Card Game

A fan-made, free and offline-first trading card game based on *The Quintessential Quintuplets*: open booster packs, inspect holo cards in 3D, grade them into slabs, build a deck and battle. There is no real money anywhere in it.

This is an unofficial fan project. It is not affiliated with or endorsed by the creators or publishers of the series; the card art is fan material.

- **Play it:** https://tqqtcg.vercel.app
- **The game:** [`playground/`](playground/) — Vite, React, strict TypeScript, React Three Fiber, Zustand, Zod, Tone.js
- **Plans and rules:** [`docs/`](docs/) (the build plan and the economy are in German, the card rules in English)

## Status

Done: the card catalogue and the holo viewer, the binder, dex and showcase, packs with the banner event, daily bonus and pity rules, and the pull show with sound. Next: decks and the battle system, then selling duplicates, grading, and the desktop build.

## Run it locally

```bash
cd playground
npm ci
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + tests
npm run build      # production build into playground/dist
```

Needs Node 24. The save game lives in the browser (IndexedDB); nothing is sent anywhere.

## Deployment

Vercel builds `playground/` from this repository (`vercel.json`). The older Next.js prototype of this repository is kept in the history under the tag `legacy-nextjs-v3`.
