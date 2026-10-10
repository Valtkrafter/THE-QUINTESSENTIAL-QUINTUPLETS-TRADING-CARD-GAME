import { describe, expect, it } from 'vitest';
import { FINISH_IDS } from '../cards/finish';
import { FINISHES, MASK_MODES } from './finishes';

describe('finish catalog', () => {
  it('describes every finish of the game exactly once', () => {
    expect(FINISHES.map((finish) => finish.id).sort()).toEqual([...FINISH_IDS].sort());
  });

  it('gives every finish its own shader branch', () => {
    const indices = FINISHES.map((finish) => finish.shaderIndex);
    expect(new Set(indices).size).toBe(indices.length);
  });

  it('only defaults to mask modes that exist', () => {
    const modes = MASK_MODES.map((mode) => mode.id);
    for (const finish of FINISHES) {
      expect(modes).toContain(finish.defaultMask);
    }
  });
});
