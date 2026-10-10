# Stage 3 patches (audit output, not applied)

Three patches against `playground/`, prototyped and verified in a throwaway copy. Production source was not modified by the audit.

Apply in order, from the `playground` folder. The flag matters on Windows: Git's default CRLF conversion would otherwise rewrite every touched file's line endings.

```bash
cd playground
git -c core.autocrlf=false apply ../docs/audit/stage3/01-fixed-text-area-and-flat-keylines.patch
git -c core.autocrlf=false apply ../docs/audit/stage3/02-flat-badges-contrast-hp-top-right.patch
git -c core.autocrlf=false apply ../docs/audit/stage3/03-foil-frame-edge-rarity-marks-typography.patch
```

Check first with `git apply --check <patch>`. Each patch builds on the previous one. They apply cleanly to the current production tree and the result passes `tsc -b` and `oxlint`.

| Patch | Decisions covered |
|---|---|
| 01 | Fixed text area in all four frames (rules text shrinks in steps, never moves); blur shadows replaced by crisp keylines |
| 02 | Flat coins/chips/pills with contrast-chosen glyph colours; HP top-right in Classic; `LV.n` + stage chip; obsidian PRIME ribbon; tag and title contrast |
| 03 | Frame-edge foil region driven by the real border width; vector rarity marks; CJK-aware wrapping; type tokens; signature mask edge |

To undo, restore the files from your own copy or run the patches in reverse order with `git apply -R`.
