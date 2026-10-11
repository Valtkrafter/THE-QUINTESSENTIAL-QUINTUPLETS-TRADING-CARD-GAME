import type { CSSProperties } from 'react';
import type { GradeBandId } from '../../domain/grading';

/** The colour of each band of scores: gold for a perfect card, then cooler colours, grey for a worn one. */
export const BAND_COLOR: Readonly<Record<GradeBandId, string>> = {
  pristine: '#f3c969',
  gem: '#b9c4ff',
  mint: '#9fd3ff',
  near: '#8fd8c8',
  excellent: '#b6dca0',
  good: '#d9c9a0',
  played: '#a9a9b3',
};

/** Sets `--band` for a subtree, so the CSS of a grade colours itself. */
export function bandStyle(band: GradeBandId): CSSProperties {
  return { '--band': BAND_COLOR[band] } as CSSProperties;
}
