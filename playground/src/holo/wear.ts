// How a copy looks when it has been handled: the four hidden sub-grades (domain/ownership.ts) become wear amounts for
// the card shader, and the copy's uid becomes a number that makes its scratches and white edges its own.

import { wearOf } from '../domain/grading';
import type { Condition } from '../domain/ownership';

export type WearVector = readonly [number, number, number, number];

/** Centering, corners, edges, surface: 0 for a perfect sub-grade, 1 for the worst one. */
export function wearVector(condition: Condition): WearVector {
  return [wearOf(condition.centering), wearOf(condition.corners), wearOf(condition.edges), wearOf(condition.surface)];
}

/** A number from 0 to 1 that is always the same for the same text (FNV-1a). */
export function wearSeedOf(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 4294967296;
}
