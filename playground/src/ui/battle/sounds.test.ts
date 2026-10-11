import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../../battle/types';
import { cuesFor } from './sounds';

const ACTIVE = { zone: 'active' } as const;

function attack(player: 0 | 1, damage: number, extra: Partial<Extract<BattleEvent, { type: 'attack' }>> = {}): BattleEvent {
  return { type: 'attack', player, cardId: 'TQQ01-001', move: 'Test', damage, doubled: false, resisted: false, reduced: false, blocked: false, ...extra };
}

describe('the sounds of a step', () => {
  it('is silent for a step in which nothing is heard', () => {
    expect(cuesFor([])).toEqual([]);
    expect(cuesFor([{ type: 'shuffle', player: 0 }, { type: 'mulligan', player: 1 }])).toEqual([]);
  });

  it('hears what the player and the enemy do on the table, but only the own draws and the own turn', () => {
    const events: BattleEvent[] = [
      { type: 'turn', turn: 2, player: 1 },
      { type: 'draw', player: 1, count: 1, cardIds: ['TQQ01-002'] },
      { type: 'play', player: 1, cardId: 'TQQ01-002', target: ACTIVE, how: 'bench' },
      { type: 'heart', player: 1, target: ACTIVE, count: 1 },
    ];
    expect(cuesFor(events).map((entry) => entry.cue.kind)).toEqual(['place', 'heart']);
    const mine: BattleEvent[] = [{ type: 'turn', turn: 3, player: 0 }, { type: 'draw', player: 0, count: 2, cardIds: ['TQQ01-002', 'TQQ01-003'] }];
    expect(cuesFor(mine).map((entry) => entry.cue)).toEqual([{ kind: 'your-turn' }, { kind: 'draw', count: 2 }]);
  });

  it('tells a new card from an evolution', () => {
    const play = (how: 'setup' | 'bench' | 'evolve'): BattleEvent => ({ type: 'play', player: 0, cardId: 'TQQ01-002', target: ACTIVE, how });
    expect(cuesFor([play('setup')])[0]?.cue.kind).toBe('place');
    expect(cuesFor([play('bench')])[0]?.cue.kind).toBe('place');
    expect(cuesFor([play('evolve')])[0]?.cue.kind).toBe('evolve');
  });

  it('carries what an attack did, and lets it land before a knock-out is heard', () => {
    const events: BattleEvent[] = [attack(0, 120, { doubled: true }), { type: 'knock-out', player: 1, cardId: 'TQQ01-003', memories: 2 }];
    const cues = cuesFor(events);
    expect(cues[0]?.cue).toEqual({ kind: 'attack', damage: 120, doubled: true, resisted: false, blocked: false });
    expect(cues[1]?.cue).toEqual({ kind: 'knock-out', memories: 2 });
    expect((cues[1]?.delay ?? 0) - (cues[0]?.delay ?? 0)).toBeGreaterThanOrEqual(0.4);
  });

  it('puts the sounds of one step in order and apart from each other', () => {
    const events: BattleEvent[] = [
      { type: 'heart', player: 0, target: ACTIVE, count: 1 },
      { type: 'heal', player: 0, target: ACTIVE, amount: 30 },
      { type: 'stun', player: 1 },
    ];
    const delays = cuesFor(events).map((entry) => entry.delay);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBe(3);
  });

  it('ends a battle with the result seen from the player at the screen', () => {
    expect(cuesFor([{ type: 'over', winner: 0, reason: 'memories' }])[0]?.cue).toEqual({ kind: 'over', result: 'win' });
    expect(cuesFor([{ type: 'over', winner: 1, reason: 'memories' }])[0]?.cue).toEqual({ kind: 'over', result: 'loss' });
    expect(cuesFor([{ type: 'over', winner: 'draw', reason: 'turn-limit' }])[0]?.cue).toEqual({ kind: 'over', result: 'draw' });
  });
});
