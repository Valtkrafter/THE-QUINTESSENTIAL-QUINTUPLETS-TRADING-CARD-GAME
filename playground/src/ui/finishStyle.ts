import type { FinishId } from '../cards/finish';
import type { Affinity } from '../cards/model';

/** A small round swatch that hints at each finish, for lists and labels. */
export const FINISH_SWATCH: Readonly<Record<FinishId, string>> = {
  standard: 'linear-gradient(135deg, #eceff6, #98a2b8)',
  rainbow: 'conic-gradient(#ff7aa8, #ffd77a, #7affc0, #7ab0ff, #c88aff, #ff7aa8)',
  sparkle: 'radial-gradient(circle at 32% 30%, #ffffff, #c4e4ff 55%, #8fb4ff)',
  cosmos: 'radial-gradient(circle at 35% 35%, #bba6ff, #3c3093 72%)',
  gold: 'linear-gradient(135deg, #fff1b8, #e4b445 55%, #a67a22)',
  prism: 'conic-gradient(from 30deg, #7cd3ff, #ffffff, #ff9bd6, #ffffff, #8dffc9, #7cd3ff)',
  radiant: 'radial-gradient(circle, #fff7d2, #ffd46e 60%, #ff9f5e)',
};

/** The soft pastel colour of a Heart type, as a CSS variable reference. */
export function affinityColor(affinity: Affinity): string {
  return `var(--affinity-${affinity})`;
}
