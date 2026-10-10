import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import type { Card } from './schema';

// The rule texts are written so that a new player understands them at first reading: short, plain words, no rules-lawyer phrases.

/** Phrases from the old rules-text style that the plain texts replaced. */
const OLD_STYLE = /Defending Character|Knocked Out|during your turn|you may |attached to|each of the Quintuplets|put it onto|Benched Characters’ moves/;

function descriptions(card: Card): { readonly where: string; readonly text: string }[] {
  if (card.kind === 'supporter') {
    return [{ where: `${card.id} supporter`, text: card.text }];
  }
  const found: { where: string; text: string }[] = [];
  if (card.ability !== undefined) {
    found.push({ where: `${card.id} ability ${card.ability.name}`, text: card.ability.text });
  }
  for (const move of card.moves) {
    if (move.text !== undefined) {
      found.push({ where: `${card.id} move ${move.name}`, text: move.text });
    }
  }
  return found;
}

const ALL = CATALOG.flatMap(descriptions);

describe('card descriptions', () => {
  it('exist for every ability and every supporter, and for every move that does more than damage', () => {
    for (const card of CATALOG) {
      if (card.kind === 'supporter') {
        expect(card.text.length).toBeGreaterThan(0);
        continue;
      }
      for (const move of card.moves) {
        const needsText = move.damage === null || move.effects.length > 0;
        expect(move.text !== undefined, `${card.id} ${move.name}`).toBe(needsText);
      }
      if (card.ability !== undefined) {
        expect(card.ability.text.length, `${card.id} ability`).toBeGreaterThan(0);
      }
    }
    expect(ALL.length).toBeGreaterThan(60);
  });

  it('are short: one or two plain sentences', () => {
    for (const { where, text } of ALL) {
      expect(text.length, where).toBeLessThanOrEqual(110);
      expect(text, where).toMatch(/[.!]$/);
      expect(text.split(/[.!?]\s/).length, where).toBeLessThanOrEqual(3);
    }
  });

  it('do not use the old rules-text phrases', () => {
    for (const { where, text } of ALL) {
      expect(text, where).not.toMatch(OLD_STYLE);
    }
  });

  it('print the damage of one sister on the moves that count sisters', () => {
    for (const card of CATALOG) {
      if (card.kind !== 'character') {
        continue;
      }
      for (const move of card.moves) {
        const perCount = move.effects.find((effect) => effect.type === 'damagePerCount' && effect.count === 'ownSisters');
        if (perCount !== undefined && perCount.type === 'damagePerCount' && move.damageSuffix === '×') {
          expect(move.damage, `${card.id} ${move.name}`).toBe(perCount.amount);
          expect(move.text, `${card.id} ${move.name}`).toContain(`${perCount.amount} damage`);
        }
      }
    }
  });

  it('say the same number in the words and in the effect', () => {
    for (const card of CATALOG) {
      if (card.kind !== 'supporter') {
        continue;
      }
      for (const effect of card.effects) {
        if (effect.type === 'draw') {
          expect(card.text, card.id).toMatch(new RegExp(`draw ${effect.count}`, 'i'));
        }
        if (effect.type === 'heal') {
          expect(card.text, card.id).toContain(`${effect.amount} HP`);
        }
      }
    }
  });
});
