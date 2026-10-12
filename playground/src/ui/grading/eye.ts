import type { CSSProperties } from 'react';
import type { EyeCheck } from '../../domain/grading';

/** The colour of each look: green for a card that shows no wear, red for one that is battered. */
export const EYE_COLOR: Readonly<Record<EyeCheck, string>> = {
  perfect: '#90d5b2',
  clean: '#a9b8f2',
  worn: '#f1d08e',
  battered: '#f2a3a3',
};

/** Sets `--eye` for a subtree, so the CSS of a look colours itself. */
export function eyeStyle(eye: EyeCheck): CSSProperties {
  return { '--eye': EYE_COLOR[eye] } as CSSProperties;
}
