# Audit patches 01 to 09: execution sequence

Nothing here has been applied to `playground/`. The audit only produced these patch files, each prototyped and verified in a throwaway copy. Run from Git Bash. Production is not a git repository, so take a backup first.

## 0. Backup

```bash
cd "C:/Users/valen/Downloads/TQQTCG"
tar --exclude=node_modules --exclude=dist -czf playground-before-audit.tgz playground
```

## 1. Patches 01 to 04 (no new dependencies)

```bash
cd "C:/Users/valen/Downloads/TQQTCG/playground"
A=../docs/audit
for p in $A/stage3/01-fixed-text-area-and-flat-keylines \
         $A/stage3/02-flat-badges-contrast-hp-top-right \
         $A/stage3/03-foil-frame-edge-rarity-marks-typography \
         $A/stage4/04-template-b-supporter-and-fade-silver; do
  git -c core.autocrlf=false apply --check $p.patch && git -c core.autocrlf=false apply $p.patch && echo "ok $(basename $p)" || break
done
npm run build && npm run lint
```

`-c core.autocrlf=false` matters on Windows: without it Git rewrites line endings in every touched file.

## 2. Bundled fonts (install, then patch 05)

```bash
npm install --save-exact @fontsource-variable/inter@5.3.0 @fontsource-variable/noto-sans-jp@5.3.0
git -c core.autocrlf=false apply --check ../docs/audit/stage4/05-bundled-fonts.patch && git -c core.autocrlf=false apply ../docs/audit/stage4/05-bundled-fonts.patch
```

Both packages are OFL-1.1 variable fonts. The production build gains 138 `.woff2` files (about 5.7 MB), loaded lazily by unicode range.

## 3. Patches 06 to 08

```bash
A=../docs/audit
for p in $A/stage4/06-vector-signatures \
         $A/stage4/07-sar-ur-embossed-foil-layer \
         $A/stage4/08-finish-pull-weights; do
  git -c core.autocrlf=false apply --check $p.patch && git -c core.autocrlf=false apply $p.patch && echo "ok $(basename $p)" || break
done
npm run build && npm run lint
```

## 4. Patch 09 (gold relief and Prism Crystal)

```bash
git -c core.autocrlf=false apply --check ../docs/audit/stage4/09-gold-relief-and-prism-crystal.patch && git -c core.autocrlf=false apply ../docs/audit/stage4/09-gold-relief-and-prism-crystal.patch
npm run build && npm run lint
```

## What each patch does

| # | Decision | Main files |
|---|---|---|
| 01 | Fixed text area, flat keylines instead of blur shadows | `cardface/rules.ts`, `classicFrame.ts`, `composeCardFace.ts`, `paint.ts` |
| 02 | Flat coins and chips, contrast-chosen glyphs, HP top-right, `LV.n` + stage chip, obsidian PRIME ribbon | `glyphs.ts`, `classicFrame.ts`, `paint.ts`, `rules.ts` |
| 03 | Frame-edge foil from the real border width, vector rarity marks, CJK wrapping, type tokens | `holo/frames.ts`, `cardFront.frag.glsl`, `paint.ts`, `model.ts` |
| 04 | Template A (Character) and Template B (Supporter); Fade uses silver instead of gold | `classicFrame.ts`, `composeCardFace.ts`, `rules.ts`, `paint.ts` |
| 05 | Bundled Inter and Noto Sans JP; faces wait for fonts before drawing | `cardface/fonts.ts`, `main.tsx`, `paint.ts`, `useComposedCard.ts`, `holo/textures.ts` |
| 06 | Signatures as vector path data drawn with a slanted nib; generator tool included | `cardface/signatureData.ts`, `tools/generate-signatures.py`, `paint.ts` |
| 07 | Embossed foil layer on SAR and UR only | `cardFront.frag.glsl`, `holo/premium.ts`, `cardRig.ts`, `HoloCard.tsx`, `Stage.tsx` |
| 08 | Finish weights per rarity for pack opening (new module, not wired yet) | `packs/finishWeights.ts` |
| 09 | Gold relief rebuilt on gradient noise (no more square patches); Cracked Ice replaced by Prism Crystal (faceted cut-gem finish) | `holo/shaders/common.glsl`, `cardFront.frag.glsl`, `holo/finishes.ts` |

## Checks after each stage

1. `npm run build` and `npm run lint` both pass.
2. Restart the dev server (`npm run dev`) and open a Classic card, a Supporter card and an SAR/UR card.
3. After 05, the Network tab should show `.woff2` requests and no request for Segoe UI or Yu Gothic.
4. After 07, an SAR/UR card shows a fine glitter relief and an embossed signature in any finish; a Rare must look unchanged.

## Rollback

Restore `playground-before-audit.tgz`, or reverse the patches in the opposite order with `git -c core.autocrlf=false apply -R <patch>`, then `npm uninstall @fontsource-variable/inter @fontsource-variable/noto-sans-jp`.

## Not wired yet

- `packs/finishWeights.ts` has placeholder odds and no caller, because the pack engine does not exist yet. Wire `pickFinish(rarity, random)` into it when it is built.
- `docs/card-system.md` still describes the pre-patch layout; update it after applying.
