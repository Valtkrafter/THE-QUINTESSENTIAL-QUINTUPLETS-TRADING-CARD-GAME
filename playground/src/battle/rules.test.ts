import { describe, expect, it } from 'vitest';
import { CATALOG, cardById } from '../cards/catalog';
import type { CharacterCard } from '../cards/model';
import { BENCH_SIZE, baseDamage, canPayMove, damageAgainst, memoriesFor, moveHeartCost, studyDiscount, survivalHp, topCard } from './rules';
import { mainState } from './testing';
import type { Figure } from './types';

function character(id: string): CharacterCard {
  const card = cardById(id);
  if (card?.kind !== 'character') {
    throw new Error(`${id} is not a Character`);
  }
  return card;
}

function figureOf(...stack: string[]): Figure {
  const state = mainState({ players: [{ active: { stack } }, {}] });
  const figure = state.players[0].active;
  if (figure === null) {
    throw new Error('no figure');
  }
  return figure;
}

describe('the card data, as the battle rules read it', () => {
  it('only asks for Hearts of the Character\'s own kind or any Heart', () => {
    for (const card of CATALOG) {
      if (card.kind !== 'character') {
        continue;
      }
      for (const move of card.moves) {
        for (const heart of move.cost) {
          expect([card.affinity, 'study']).toContain(heart);
        }
      }
    }
  });

  it('only uses the one-card peek that the engine knows', () => {
    for (const card of CATALOG) {
      const effects = card.kind === 'supporter' ? card.effects : [...(card.ability?.effects ?? []), ...card.moves.flatMap((move) => move.effects)];
      for (const effect of effects) {
        if (effect.type === 'peekTopMayBottom') {
          expect(effect.count).toBe(1);
        }
      }
    }
  });

  it('prints damage that fits the effect a move carries', () => {
    for (const card of CATALOG) {
      if (card.kind !== 'character') {
        continue;
      }
      for (const move of card.moves) {
        const scales = move.effects.some((effect) => effect.type === 'damagePerHeart' || effect.type === 'damagePerCount');
        expect(scales).toBe(move.damageSuffix !== undefined);
        if (move.damageSuffix === '×') {
          const effect = move.effects.find((candidate) => candidate.type === 'damagePerCount');
          expect(effect?.type === 'damagePerCount' && effect.amount === move.damage).toBe(true);
        }
      }
    }
  });
});

describe('what a move costs', () => {
  it('counts every Heart of the cost, and a Bench ability can take grey Hearts away', () => {
    const move = character('TQQ01-004').moves[0];
    expect(move).toBeDefined();
    if (move === undefined) {
      return;
    }
    expect(moveHeartCost(move, 0)).toBe(3);
    expect(moveHeartCost(move, 1)).toBe(2);
    expect(moveHeartCost(move, 5)).toBe(2);
    const state = mainState({ players: [{ active: { stack: ['TQQ01-001', 'TQQ01-004'], hearts: 2 }, bench: [{ stack: ['TQQ01-037', 'TQQ01-040', 'TQQ01-041'] }] }, {}] });
    const owner = state.players[0];
    expect(studyDiscount(owner)).toBe(1);
    if (owner.active !== null) {
      expect(canPayMove(owner.active, move, studyDiscount(owner))).toBe(true);
      expect(canPayMove(owner.active, move, 0)).toBe(false);
    }
  });

  it('does not count a helper that is in the front instead of on the Bench', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-037', 'TQQ01-040', 'TQQ01-041'] } }, {}] });
    expect(studyDiscount(state.players[0])).toBe(0);
  });
});

describe('damage before and after the defender', () => {
  it('adds the Hearts and the board to a "+" move and multiplies for a "×" move', () => {
    const encore = character('TQQ01-007').moves[0];
    const five = character('TQQ01-054').moves[0];
    if (encore === undefined || five === undefined) {
      throw new Error('moves missing');
    }
    const state = mainState({
      players: [
        {
          active: { stack: ['TQQ01-049', 'TQQ01-052', 'TQQ01-054'], hearts: 3 },
          bench: [{ stack: ['TQQ01-001'] }, { stack: ['TQQ01-013'] }],
        },
        {},
      ],
    });
    const owner = state.players[0];
    if (owner.active === null) {
      throw new Error('no active');
    }
    expect(baseDamage(encore, owner.active, owner)).toBe(70 + 30 * 3);
    expect(baseDamage(five, owner.active, owner)).toBe(30 * 3);
  });

  it('doubles for weakness, lowers by 30 for resistance, in that order', () => {
    const nino = character('TQQ01-013');
    const ichikaFigure = figureOf('TQQ01-001');
    const butterflyAttack = damageAgainst(20, nino, ichikaFigure, false);
    expect(butterflyAttack).toMatchObject({ damage: 40, doubled: true, resisted: false });
    const ninoFigure = figureOf('TQQ01-013');
    const ichika = character('TQQ01-001');
    expect(damageAgainst(50, ichika, ninoFigure, false)).toMatchObject({ damage: 20, doubled: false, resisted: true });
    expect(damageAgainst(20, ichika, ninoFigure, false).damage).toBe(0);
    // Miku's melody is what Nino is weak to; Yotsuba resists it.
    const miku = character('TQQ01-025');
    expect(damageAgainst(40, miku, ninoFigure, false)).toMatchObject({ damage: 80, doubled: true, resisted: false });
    expect(damageAgainst(40, miku, figureOf('TQQ01-037'), false)).toMatchObject({ damage: 10, doubled: false, resisted: true });
  });

  it('takes off what a Character\'s own ability prevents, never below zero', () => {
    const attacker = character('TQQ01-013');
    const bride = figureOf('TQQ01-001', 'TQQ01-004', 'TQQ01-006');
    expect(topCard(bride).ability?.name).toContain('Eldest');
    expect(damageAgainst(110, attacker, bride, false)).toMatchObject({ damage: 110 * 2 - 30, doubled: true, reduced: true });
    expect(damageAgainst(10, character('TQQ01-049'), bride, false).damage).toBe(0);
  });

  it('is stopped completely by a shield, but only when there was damage to stop', () => {
    const attacker = character('TQQ01-013');
    const target = figureOf('TQQ01-049');
    expect(damageAgainst(40, attacker, target, true)).toMatchObject({ damage: 0, blocked: true });
    expect(damageAgainst(0, attacker, target, true)).toMatchObject({ damage: 0, blocked: false });
  });

  it('knows who survives a knock-out by luck and how many Memories a fall is worth', () => {
    const bride = figureOf('TQQ01-025', 'TQQ01-028', 'TQQ01-030');
    expect(survivalHp(bride)).toBe(10);
    expect(survivalHp(figureOf('TQQ01-001'))).toBeNull();
    expect(memoriesFor(figureOf('TQQ01-001'))).toBe(1);
    expect(memoriesFor(figureOf('TQQ01-012'))).toBe(2);
  });

  it('has room for three Characters on the Bench', () => {
    expect(BENCH_SIZE).toBe(3);
  });
});
