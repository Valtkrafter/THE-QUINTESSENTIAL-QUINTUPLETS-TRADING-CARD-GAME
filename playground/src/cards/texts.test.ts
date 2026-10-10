import { describe, expect, it } from 'vitest';
import textsDe from '../data/cards.de.json';
import { CATALOG, CATALOG_ORIGINAL } from './catalog';
import { applyTexts } from './texts';

/** Titles that are the same in both languages. */
const SAME_ON_PURPOSE = new Set(['Hand in Hand']);

/** English words that must not be left over in the German text (words that are also German, like "Deck", are fine). */
const ENGLISH_LEFTOVERS = /\b(Character|Characters|Heart|Hearts|damage|Bench|Benched|Active|Supporter|Basic|Defending|coin|flip|draw|heal|attach|shuffle|discard|your|opponent)\b/i;

function allStrings(card: (typeof CATALOG)[number]): string[] {
  if (card.kind === 'supporter') {
    return [card.title, card.text];
  }
  return [
    card.title,
    ...(card.ability === undefined ? [] : [card.ability.name, card.ability.text]),
    ...card.moves.flatMap((move) => (move.text === undefined ? [move.name] : [move.name, move.text])),
  ];
}

describe('the German card texts', () => {
  it('fit all 79 cards and keep their rules untouched', () => {
    expect(CATALOG).toHaveLength(79);
    CATALOG.forEach((card, index) => {
      const original = CATALOG_ORIGINAL[index];
      expect(card.id).toBe(original?.id);
      if (card.kind === 'character' && original?.kind === 'character') {
        expect(card.moves.map((move) => [move.cost, move.damage, move.damageSuffix, move.effects])).toEqual(
          original.moves.map((move) => [move.cost, move.damage, move.damageSuffix, move.effects]),
        );
        expect(card.ability?.effects).toEqual(original.ability?.effects);
        expect(card.hp).toBe(original.hp);
      }
    });
  });

  it('replace every English title, move, ability and rule text', () => {
    CATALOG.forEach((card, index) => {
      const original = CATALOG_ORIGINAL[index];
      if (original === undefined) {
        return;
      }
      const before = allStrings(original);
      const after = allStrings(card);
      expect(after).toHaveLength(before.length);
      after.forEach((line, position) => {
        const english = before[position] ?? '';
        if (!SAME_ON_PURPOSE.has(english)) {
          expect(line, `${card.id}: "${english}" is still English`).not.toBe(english);
        }
        expect(line, `${card.id}: "${line}"`).not.toMatch(ENGLISH_LEFTOVERS);
      });
    });
  });

  it('are short enough for the fixed text areas of a printed card', () => {
    for (const card of CATALOG) {
      expect(card.title.length, card.title).toBeLessThanOrEqual(40);
      if (card.kind === 'supporter') {
        expect(card.text.length, card.id).toBeLessThanOrEqual(130);
        continue;
      }
      if (card.ability !== undefined) {
        expect(card.ability.name.length, card.ability.name).toBeLessThanOrEqual(36);
        expect(card.ability.text.length, card.id).toBeLessThanOrEqual(130);
      }
      for (const move of card.moves) {
        expect(move.name.length, move.name).toBeLessThanOrEqual(30);
        expect((move.text ?? '').length, card.id).toBeLessThanOrEqual(130);
      }
    }
  });

  it('use one word for each game term', () => {
    const text = CATALOG.flatMap(allStrings).join('\n');
    expect(text).not.toMatch(/Charakter/);
    expect(text).not.toMatch(/Unterstützer/);
    expect(text).not.toMatch(/aktive Figur/);
  });
});

describe('laying texts over cards', () => {
  const cards = CATALOG_ORIGINAL.slice(0, 3);
  const good = {
    'TQQ01-001': { title: 'A', moves: [{ name: 'Move' }] },
    'TQQ01-002': { title: 'B', moves: [{ name: 'Move', text: 'Text.' }] },
    'TQQ01-003': { title: 'C', moves: [{ name: 'One' }, { name: 'Two', text: 'Text.' }] },
  };

  it('replaces the strings of the cards it is given', () => {
    const result = applyTexts(cards, good);
    expect(result.map((card) => card.title)).toEqual(['A', 'B', 'C']);
    expect(result[2]?.kind === 'character' ? result[2].moves.map((move) => move.name) : []).toEqual(['One', 'Two']);
  });

  it('stops with every problem listed when the texts do not fit', () => {
    const wrong = {
      'TQQ01-001': { title: 'A', moves: [{ name: 'Move' }, { name: 'Extra' }] },
      'TQQ01-002': { title: 'B', moves: [{ name: 'Move' }] },
      'TQQ01-777': { title: 'Z', text: 'No such card.' },
    };
    expect(() => applyTexts(cards, wrong)).toThrowError(/1 moves on the card, 2 in the text/);
    expect(() => applyTexts(cards, wrong)).toThrowError(/must have a rule text/);
    expect(() => applyTexts(cards, wrong)).toThrowError(/there is no such card/);
    expect(() => applyTexts(cards, wrong)).toThrowError(/TQQ01-003: no text/);
  });

  it('refuses text that is not shaped like card text', () => {
    expect(() => applyTexts(cards, { 'TQQ01-001': { title: '' } })).toThrowError(/invalid/);
    expect(() => applyTexts(cards, { 'TQQ01-001': { title: 'A', colour: 'red' } })).toThrowError(/invalid/);
    expect(() => applyTexts(cards, 'nope')).toThrowError(/invalid/);
  });

  it('knows the German file by its keys', () => {
    expect(Object.keys(textsDe)).toHaveLength(79);
  });
});
