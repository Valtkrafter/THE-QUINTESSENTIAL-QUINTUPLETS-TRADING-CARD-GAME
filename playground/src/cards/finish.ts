// A finish is the foil treatment of one printed copy. Only the identity lives here (game rules need it);
// the look of each finish (label, shader branch) is in holo/finishes.ts.

export const FINISH_IDS = ['standard', 'rainbow', 'sparkle', 'cosmos', 'gold', 'prism', 'radiant'] as const;
export type FinishId = (typeof FINISH_IDS)[number];

export function isFinishId(value: string): value is FinishId {
  return (FINISH_IDS as readonly string[]).includes(value);
}
