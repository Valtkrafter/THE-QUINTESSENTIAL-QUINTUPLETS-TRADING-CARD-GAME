import { describe, expect, it } from 'vitest';
import { CATALOG } from '../cards/catalog';
import { isBasicPlayable } from '../domain/decks';
import { createBattle, step } from './engine';
import { legalActions, usableMoves } from './legal';
import { observe, HIDDEN_CARD } from './observe';
import { TURN_LIMIT, freeHearts, freeHeartsNext } from './rules';
import { coinSeed, invariantProblems, mainState, play, simpleDeck, startedBattle } from './testing';
import type { BattleAction, BattleEvent, BattleState, PlayerIndex } from './types';

const DECKS = [simpleDeck('ichika'), simpleDeck('nino')] as const;

/** A deck with exactly one Character that can be played from the hand, so most opening hands have to be dealt again. */
function fewBasicsDeck(): string[] {
  const deck = ['TQQ01-001', 'TQQ01-061'];
  const filler = CATALOG.filter(
    (card) => card.id !== 'TQQ01-061' && (card.kind === 'supporter' || (card.kind === 'character' && !card.prime && !isBasicPlayable(card))),
  );
  for (const card of filler) {
    if (deck.length + 2 > 30) {
      break;
    }
    deck.push(card.id, card.id);
  }
  return deck;
}

const ATTACK: BattleAction = { type: 'attack', moveIndex: 0 };

function eventsOf<T extends BattleEvent['type']>(events: readonly BattleEvent[], type: T): Extract<BattleEvent, { type: T }>[] {
  return events.filter((event): event is Extract<BattleEvent, { type: T }> => event.type === type);
}

describe('starting a battle', () => {
  it('deals five cards to each player, with a Character to start with in every hand', () => {
    const created = createBattle({ decks: DECKS, seed: 'deal' });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const { state } = created;
    expect(state.phase).toBe('setup');
    expect(state.turn).toBe(0);
    for (const player of state.players) {
      expect(player.hand).toHaveLength(5);
      expect(player.deck).toHaveLength(25);
      expect(player.hand.some((id) => CATALOG.some((card) => card.id === id && isBasicPlayable(card)))).toBe(true);
    }
    expect(invariantProblems(state)).toEqual([]);
  });

  it('is repeatable for one seed and different for another', () => {
    const a = createBattle({ decks: DECKS, seed: 'same' });
    const b = createBattle({ decks: DECKS, seed: 'same' });
    const c = createBattle({ decks: DECKS, seed: 'other' });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('refuses a deck that is not legal', () => {
    const result = createBattle({ decks: [DECKS[0].slice(1), DECKS[1]], seed: 'bad' });
    expect(result.ok).toBe(false);
  });

  it('lets a coin pick who goes first, unless it is decided', () => {
    const coin = createBattle({ decks: DECKS, seed: 'coin' });
    expect(coin.ok && coin.events.some((event) => event.type === 'coin')).toBe(true);
    const fixed = createBattle({ decks: DECKS, seed: 'coin', first: 1 });
    expect(fixed.ok && fixed.state.first).toBe(1);
    expect(fixed.ok && fixed.events.some((event) => event.type === 'coin')).toBe(false);
  });

  it('shows a hand without a Basic and deals it again', () => {
    let redealt = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      const created = createBattle({ decks: [fewBasicsDeck(), fewBasicsDeck()], seed: `few-${seed}` });
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }
      redealt += created.state.mulligans[0] + created.state.mulligans[1];
      for (const player of created.state.players) {
        expect(player.hand.includes('TQQ01-001')).toBe(true);
        expect(player.hand).toHaveLength(5);
      }
    }
    expect(redealt).toBeGreaterThan(10);
  });

  it('plays through the setup and starts the first turn of the player who goes first', () => {
    const state = startedBattle({ decks: DECKS, seed: 'setup' });
    expect(state.phase).toBe('main');
    expect(state.turn).toBe(1);
    expect(state.current).toBe(state.first);
    const first = state.players[state.first];
    expect(first.hand.length + first.bench.length + 1).toBeGreaterThanOrEqual(6);
    expect(first.turnsTaken).toBe(1);
    expect(first.active).not.toBeNull();
    expect(invariantProblems(state)).toEqual([]);
  });

  it('needs an Active Character before the setup can be finished, and takes the Bench in any amount up to three', () => {
    const created = createBattle({ decks: DECKS, seed: 'order' });
    if (!created.ok) {
      throw new Error(created.error);
    }
    const state = created.state;
    const player = state.first;
    const first = legalActions(state, player);
    expect(first.some((action) => action.type === 'setup-done')).toBe(false);
    expect(first.every((action) => action.type === 'setup-place' && action.to === 'active')).toBe(true);
    const afterActive = play(state, first[0] ?? { type: 'end-turn' }).state;
    const next = legalActions(afterActive, player);
    expect(next.some((action) => action.type === 'setup-done')).toBe(true);
    expect(next.every((action) => action.type !== 'setup-place' || action.to === 'bench')).toBe(true);
  });
});

describe('the first turns', () => {
  const blank = { stack: ['TQQ01-001'], hearts: 1 } as const;

  it('does not let the player who goes first attack in their first turn, but lets the other one', () => {
    const firstTurn = mainState({ turn: 1, current: 0, first: 0, players: [{ turnsTaken: 1, active: blank }, { turnsTaken: 0, active: blank }] });
    expect(usableMoves(firstTurn, 0)).toEqual([]);
    const secondTurn = mainState({ turn: 2, current: 1, first: 0, players: [{ turnsTaken: 1, active: blank }, { turnsTaken: 1, active: blank }] });
    expect(usableMoves(secondTurn, 1)).toEqual([0]);
    const later = mainState({ turn: 3, current: 0, first: 0, players: [{ turnsTaken: 2, active: blank }, { turnsTaken: 1, active: blank }] });
    expect(usableMoves(later, 0)).toEqual([0]);
  });

  it('gives each player two free Hearts per turn, to any of their Characters', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-001'] }, bench: [{ stack: ['TQQ01-013'] }] }, { active: { stack: ['TQQ01-001'] } }] });
    const targets = legalActions(state, 0).filter((action) => action.type === 'give-heart');
    expect(targets).toHaveLength(2);
    const given = play(state, { type: 'give-heart', target: { zone: 'bench', index: 0 } });
    expect(given.state.players[0].bench[0]?.hearts).toBe(1);
    expect(legalActions(given.state, 0).some((action) => action.type === 'give-heart')).toBe(true);
    const both = play(given.state, { type: 'give-heart', target: { zone: 'bench', index: 0 } });
    expect(both.state.players[0].bench[0]?.hearts).toBe(2);
    expect(legalActions(both.state, 0).some((action) => action.type === 'give-heart')).toBe(false);
    const refused = step(both.state, { type: 'give-heart', target: { zone: 'active' } });
    expect(refused.ok).toBe(false);
  });

  it('gives no free Hearts in the very first turn to the player who goes first, and three to the one who goes second', () => {
    const board = { active: { stack: ['TQQ01-001'] }, bench: [{ stack: ['TQQ01-013'] }] } as const;
    const first = mainState({ turn: 1, current: 0, first: 0, players: [{ turnsTaken: 1, ...board }, { turnsTaken: 0, ...board }] });
    expect(freeHearts(first, 0)).toBe(0);
    expect(legalActions(first, 0).some((action) => action.type === 'give-heart')).toBe(false);

    const second = mainState({ turn: 2, current: 1, first: 0, players: [{ turnsTaken: 1, ...board }, { turnsTaken: 1, ...board }] });
    expect(freeHearts(second, 1)).toBe(3);
    let state = second;
    for (const target of [{ zone: 'active' }, { zone: 'bench', index: 0 }, { zone: 'active' }] as const) {
      expect(legalActions(state, 1).some((action) => action.type === 'give-heart')).toBe(true);
      state = play(state, { type: 'give-heart', target }).state;
    }
    expect(legalActions(state, 1).some((action) => action.type === 'give-heart')).toBe(false);
    expect(state.players[1].active?.hearts).toBe(2);
    expect(state.players[1].bench[0]?.hearts).toBe(1);

    // From the second turn on, both get two.
    const later = mainState({ turn: 3, current: 0, first: 0, players: [{ turnsTaken: 2, ...board }, { turnsTaken: 1, ...board }] });
    expect(freeHearts(later, 0)).toBe(2);
    const reply = mainState({ turn: 4, current: 1, first: 0, players: [{ turnsTaken: 2, ...board }, { turnsTaken: 2, ...board }] });
    expect(freeHearts(reply, 1)).toBe(2);
    expect(freeHeartsNext(second, 0)).toBe(2);
    expect(freeHeartsNext(first, 1)).toBe(3);
  });

  it('draws a card at the start of every turn and counts the turns', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-001'] } }, { active: { stack: ['TQQ01-001'] }, hand: ['TQQ01-013'] }] });
    const { state: next, events } = play(state, { type: 'end-turn' });
    expect(next.turn).toBe(state.turn + 1);
    expect(next.current).toBe(1);
    expect(next.players[1].hand).toHaveLength(2);
    expect(next.players[1].turnsTaken).toBe(4);
    expect(eventsOf(events, 'turn')).toEqual([{ type: 'turn', turn: state.turn + 1, player: 1 }]);
    expect(eventsOf(events, 'draw')).toHaveLength(1);
  });
});

describe('evolving', () => {
  const basicIchika = { stack: ['TQQ01-001'], hearts: 2, damage: 20 } as const;

  it('puts a Close card on its Basic and keeps the Hearts and the damage', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-004'], active: basicIchika }, { active: { stack: ['TQQ01-013'] } }] });
    const { state: after, events } = play(state, { type: 'evolve', handIndex: 0, target: { zone: 'active' } });
    const figure = after.players[0].active;
    expect(figure?.stack).toEqual(['TQQ01-001', 'TQQ01-004']);
    expect(figure?.hearts).toBe(2);
    expect(figure?.damage).toBe(20);
    expect(after.players[0].hand).toEqual([]);
    expect(eventsOf(events, 'play')[0]).toMatchObject({ how: 'evolve', cardId: 'TQQ01-004' });
  });

  it('goes Basic, Close, Bride in that order and only for the same sister', () => {
    const base = { hand: ['TQQ01-006', 'TQQ01-016', 'TQQ01-004'], active: basicIchika };
    const state = mainState({ players: [base, { active: { stack: ['TQQ01-013'] } }] });
    const evolves = legalActions(state, 0).filter((action) => action.type === 'evolve');
    expect(evolves).toEqual([{ type: 'evolve', handIndex: 2, target: { zone: 'active' } }]);
    const closeIchika = mainState({ players: [{ hand: ['TQQ01-006'], active: { stack: ['TQQ01-001', 'TQQ01-004'] } }, {}] });
    expect(legalActions(closeIchika, 0).filter((action) => action.type === 'evolve')).toHaveLength(1);
  });

  it('waits one turn for a new Character, never evolves twice in a turn and never in the first turn of the player', () => {
    const hand = ['TQQ01-004'];
    const arrived = mainState({ turn: 7, players: [{ hand, active: { ...basicIchika, arrivedTurn: 7 } }, {}] });
    expect(legalActions(arrived, 0).some((action) => action.type === 'evolve')).toBe(false);
    const evolved = mainState({ turn: 7, players: [{ hand: ['TQQ01-006'], active: { stack: ['TQQ01-001', 'TQQ01-004'], evolvedTurn: 7 } }, {}] });
    expect(legalActions(evolved, 0).some((action) => action.type === 'evolve')).toBe(false);
    const young = mainState({ players: [{ hand, turnsTaken: 1, active: basicIchika }, {}] });
    expect(legalActions(young, 0).some((action) => action.type === 'evolve')).toBe(false);
    const ready = mainState({ turn: 7, players: [{ hand, active: { ...basicIchika, arrivedTurn: 6 } }, {}] });
    expect(legalActions(ready, 0).some((action) => action.type === 'evolve')).toBe(true);
  });

  it('plays an Event card straight to the Bench, where it cannot be built upon', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-012', 'TQQ01-004'], active: basicIchika }, {}] });
    const actions = legalActions(state, 0);
    expect(actions).toContainEqual({ type: 'play-basic', handIndex: 0 });
    const after = play(state, { type: 'play-basic', handIndex: 0 }).state;
    const eventCharacter = after.players[0].bench[0];
    expect(eventCharacter?.stack).toEqual(['TQQ01-012']);
    expect(legalActions(after, 0).filter((action) => action.type === 'evolve' && action.target.zone === 'bench')).toEqual([]);
  });

  it('allows three Characters on the Bench and no more', () => {
    const bench = [{ stack: ['TQQ01-013'] }, { stack: ['TQQ01-013'] }, { stack: ['TQQ01-013'] }];
    const full = mainState({ players: [{ hand: ['TQQ01-001'], active: basicIchika, bench }, {}] });
    expect(legalActions(full, 0).some((action) => action.type === 'play-basic')).toBe(false);
    const roomy = mainState({ players: [{ hand: ['TQQ01-001'], active: basicIchika, bench: bench.slice(0, 2) }, {}] });
    expect(legalActions(roomy, 0).some((action) => action.type === 'play-basic')).toBe(true);
  });
});

describe('attacking', () => {
  it('needs the Hearts of the move, does the damage and passes the turn', () => {
    const none = mainState({ players: [{ active: { stack: ['TQQ01-013'] } }, { active: { stack: ['TQQ01-001'] } }] });
    expect(legalActions(none, 0).some((action) => action.type === 'attack')).toBe(false);
    const ready = mainState({ players: [{ active: { stack: ['TQQ01-013'], hearts: 1 } }, { active: { stack: ['TQQ01-001'] } }] });
    const { state, events } = play(ready, ATTACK);
    // Nino is a butterfly and Ichika is weak against butterflies: 20 doubled.
    expect(state.players[1].active?.damage).toBe(40);
    expect(eventsOf(events, 'attack')[0]).toMatchObject({ damage: 40, doubled: true, resisted: false, blocked: false });
    expect(state.current).toBe(1);
    expect(state.turn).toBe(ready.turn + 1);
  });

  it('lowers damage for resistance and for the protective abilities of the defender', () => {
    const resisted = mainState({ players: [{ active: { stack: ['TQQ01-001'], hearts: 1 } }, { active: { stack: ['TQQ01-013'] } }] });
    expect(play(resisted, ATTACK).state.players[1].active?.damage).toBe(0);
    const plain = mainState({
      players: [
        { active: { stack: ['TQQ01-025', 'TQQ01-028', 'TQQ01-029'], hearts: 3 } },
        { active: { stack: ['TQQ01-025', 'TQQ01-028'] } },
      ],
    });
    // Close Miku does 90 to another Close Miku without weakness, resistance or an ability.
    expect(play(plain, ATTACK).state.players[1].active?.damage).toBe(90);
    const protectedBride = mainState({
      players: [
        { active: { stack: ['TQQ01-001', 'TQQ01-004', 'TQQ01-005'], hearts: 3 } },
        { active: { stack: ['TQQ01-025', 'TQQ01-028', 'TQQ01-029'] } },
      ],
    });
    // 90 damage, minus the 20 that Headphones On takes off.
    expect(play(protectedBride, ATTACK).state.players[1].active?.damage).toBe(70);
  });

  it('is stopped by a shield of the turn it was made for', () => {
    const shielded = mainState({ turn: 7, players: [{ active: { stack: ['TQQ01-013'], hearts: 1 } }, { active: { stack: ['TQQ01-001'] }, shieldTurn: 7 }] });
    const { state, events } = play(shielded, ATTACK);
    expect(state.players[1].active?.damage).toBe(0);
    expect(eventsOf(events, 'attack')[0]).toMatchObject({ damage: 0, blocked: true });
    const old = mainState({ turn: 7, players: [{ active: { stack: ['TQQ01-013'], hearts: 1 } }, { active: { stack: ['TQQ01-001'] }, shieldTurn: 6 }] });
    expect(play(old, ATTACK).state.players[1].active?.damage).toBe(40);
  });

  it('cannot be done by a Character that was stunned for this turn', () => {
    const stunned = mainState({ turn: 7, players: [{ active: { stack: ['TQQ01-013'], hearts: 1, stunTurn: 7 } }, { active: { stack: ['TQQ01-001'] } }] });
    expect(usableMoves(stunned, 0)).toEqual([]);
    const later = mainState({ turn: 7, players: [{ active: { stack: ['TQQ01-013'], hearts: 1, stunTurn: 6 } }, { active: { stack: ['TQQ01-001'] } }] });
    expect(usableMoves(later, 0)).toEqual([0]);
  });

});

describe('the Hearts of a move', () => {
  it('are taken off the Character that made it, and only as many as the move costs', () => {
    const ready = mainState({ players: [{ active: { stack: ['TQQ01-013'], hearts: 3 } }, { active: { stack: ['TQQ01-001'] } }] });
    const { state, events } = play(ready, ATTACK);
    expect(state.players[0].active?.hearts).toBe(2);
    expect(eventsOf(events, 'attack')[0]).toMatchObject({ spent: 1 });
    // "Rehearsal" costs a Heart and a grey one.
    const two = mainState({ players: [{ active: { stack: ['TQQ01-003'], hearts: 3 } }, { active: { stack: ['TQQ01-049'] } }] });
    const hit = play(two, { type: 'attack', moveIndex: 1 });
    expect(hit.state.players[0].active?.hearts).toBe(1);
    expect(eventsOf(hit.events, 'attack')[0]).toMatchObject({ spent: 2 });
  });

  it('leave nothing for a second move: the Character has to be given Hearts again', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-001', 'TQQ01-004'], hearts: 3 } }, { active: { stack: ['TQQ01-025', 'TQQ01-028'] } }] });
    expect(usableMoves(state, 0)).toEqual([0]);
    const after = play(state, ATTACK).state;
    expect(after.players[0].active?.hearts).toBe(0);
    // The turn is over, but even with a new turn of its own the Character has nothing until Hearts are given to it.
    const back = play(after, { type: 'end-turn' }).state;
    expect(back.current).toBe(0);
    expect(usableMoves(back, 0)).toEqual([]);
    const refilled = play(back, { type: 'give-heart', target: { zone: 'active' } }, { type: 'give-heart', target: { zone: 'active' } }).state;
    expect(usableMoves(refilled, 0)).toEqual([]);
    expect(refilled.players[0].active?.hearts).toBe(2);
  });

  it('are used up even when a shield or a resistance leaves no damage', () => {
    const shielded = mainState({ turn: 7, players: [{ active: { stack: ['TQQ01-013'], hearts: 1 } }, { active: { stack: ['TQQ01-001'] }, shieldTurn: 7 }] });
    expect(play(shielded, ATTACK).state.players[0].active?.hearts).toBe(0);
    const resisted = mainState({ players: [{ active: { stack: ['TQQ01-001'], hearts: 1 } }, { active: { stack: ['TQQ01-013'] } }] });
    const { state, events } = play(resisted, ATTACK);
    expect(eventsOf(events, 'attack')[0]).toMatchObject({ damage: 0, spent: 1 });
    expect(state.players[0].active?.hearts).toBe(0);
  });

  it('count for the extra damage of a "+" move as the Character held them when it attacked', () => {
    // "Encore": 70 and 30 more for every Heart. Four Hearts are on the Character, three are used up, and all four count.
    const state = mainState({
      players: [{ active: { stack: ['TQQ01-001', 'TQQ01-004', 'TQQ01-007'], hearts: 4 } }, { active: { stack: ['TQQ01-001'] }, bench: [{ stack: ['TQQ01-013'] }] }],
    });
    const { state: after, events } = play(state, ATTACK);
    expect(eventsOf(events, 'attack')[0]).toMatchObject({ damage: 70 + 30 * 4, spent: 3 });
    expect(after.players[0].active?.hearts).toBe(1);
  });

  it('are paid with one grey Heart less when a Bench ability says so, and that Heart stays', () => {
    // "Dramatic Entrance" costs three; Yotsuba on the Bench ("Ribbon of Support") pays one grey Heart of it.
    const state = mainState({
      players: [
        { active: { stack: ['TQQ01-001', 'TQQ01-004'], hearts: 3 }, bench: [{ stack: ['TQQ01-037', 'TQQ01-040', 'TQQ01-041'] }] },
        { active: { stack: ['TQQ01-025', 'TQQ01-028'] } },
      ],
    });
    const { state: after, events } = play(state, ATTACK);
    expect(eventsOf(events, 'attack')[0]).toMatchObject({ spent: 2 });
    expect(after.players[0].active?.hearts).toBe(1);
  });
});

describe('knock-outs', () => {
  const finisher = { stack: ['TQQ01-001', 'TQQ01-004', 'TQQ01-010'], hearts: 3 } as const;

  it('gives one Memory, discards the whole pile and lets the defender choose who steps up', () => {
    const state = mainState({
      players: [{ active: finisher }, { active: { stack: ['TQQ01-001'] }, bench: [{ stack: ['TQQ01-013'] }, { stack: ['TQQ01-037'] }] }],
    });
    const hit = play(state, ATTACK);
    expect(hit.state.players[0].memories).toBe(1);
    expect(hit.state.players[1].discard).toContain('TQQ01-001');
    expect(hit.state.players[1].active).toBeNull();
    expect(hit.state.pending?.player).toBe(1);
    expect(hit.state.pending?.prompt.kind).toBe('figure');
    expect(legalActions(hit.state, 0)).toEqual([]);
    expect(legalActions(hit.state, 1).map((action) => (action.type === 'choose' ? action.option : -2))).toEqual([0, 1]);
    const chosen = play(hit.state, { type: 'choose', option: 1 });
    expect(chosen.state.players[1].active?.stack).toEqual(['TQQ01-037']);
    expect(chosen.state.players[1].bench.map((figure) => figure.stack[0])).toEqual(['TQQ01-013']);
    expect(chosen.state.current).toBe(1);
    expect(eventsOf(chosen.events, 'promote')).toHaveLength(1);
  });

  it('steps the only Benched Character up without asking', () => {
    const state = mainState({ players: [{ active: finisher }, { active: { stack: ['TQQ01-001'] }, bench: [{ stack: ['TQQ01-013'] }] }] });
    const hit = play(state, ATTACK);
    expect(hit.state.pending).toBeNull();
    expect(hit.state.players[1].active?.stack).toEqual(['TQQ01-013']);
    expect(hit.state.current).toBe(1);
  });

  it('gives two Memories for a Prime Character', () => {
    const state = mainState({ players: [{ active: finisher }, { active: { stack: ['TQQ01-012'] }, bench: [{ stack: ['TQQ01-013'] }] }] });
    expect(play(state, ATTACK).state.players[0].memories).toBe(2);
  });

  it('is a win with six Memories', () => {
    const state = mainState({ players: [{ active: finisher, memories: 5 }, { active: { stack: ['TQQ01-001'] }, bench: [{ stack: ['TQQ01-013'] }] }] });
    const { state: end, events } = play(state, ATTACK);
    expect(end.phase).toBe('over');
    expect(end.winner).toBe(0);
    expect(end.endReason).toBe('memories');
    expect(eventsOf(events, 'over')).toEqual([{ type: 'over', winner: 0, reason: 'memories' }]);
    expect(legalActions(end, 0)).toEqual([]);
    expect(step(end, { type: 'end-turn' }).ok).toBe(false);
  });

  it('is a win when the other side has nobody left', () => {
    const state = mainState({ players: [{ active: finisher }, { active: { stack: ['TQQ01-001'] } }] });
    const { state: end } = play(state, ATTACK);
    expect(end.winner).toBe(0);
    expect(end.endReason).toBe('no-fighters');
    expect(end.players[0].memories).toBe(1);
  });

  it('may be survived by luck on heads and not on tails', () => {
    const miku = { stack: ['TQQ01-025', 'TQQ01-028', 'TQQ01-030'] } as const;
    const build = (heads: boolean): BattleState =>
      mainState({ seed: coinSeed(heads), players: [{ active: finisher }, { active: miku, bench: [{ stack: ['TQQ01-013'] }] }] });
    const lucky = play(build(true), ATTACK);
    expect(eventsOf(lucky.events, 'survive')).toHaveLength(1);
    expect(lucky.state.players[1].active?.damage).toBe(140);
    expect(lucky.state.players[0].memories).toBe(0);
    const unlucky = play(build(false), ATTACK);
    expect(eventsOf(unlucky.events, 'survive')).toHaveLength(0);
    expect(eventsOf(unlucky.events, 'knock-out')).toHaveLength(1);
    expect(unlucky.state.players[0].memories).toBe(1);
  });
});

describe('retreating', () => {
  const tired = { stack: ['TQQ01-001'], hearts: 2 } as const;

  it('pays the retreat cost in Hearts, swaps places and works once a turn', () => {
    const state = mainState({ players: [{ active: tired, bench: [{ stack: ['TQQ01-013'], hearts: 1 }, { stack: ['TQQ01-037'] }] }, { active: { stack: ['TQQ01-001'] } }] });
    const { state: after, events } = play(state, { type: 'retreat', benchIndex: 1 });
    expect(after.players[0].active?.stack).toEqual(['TQQ01-037']);
    expect(after.players[0].bench[1]?.stack).toEqual(['TQQ01-001']);
    expect(after.players[0].bench[1]?.hearts).toBe(1);
    expect(eventsOf(events, 'retreat')).toEqual([{ type: 'retreat', player: 0, cost: 1 }]);
    expect(legalActions(after, 0).some((action) => action.type === 'retreat')).toBe(false);
  });

  it('needs enough Hearts and somebody to take the place', () => {
    const poor = mainState({ players: [{ active: { stack: ['TQQ01-004'], hearts: 1 }, bench: [{ stack: ['TQQ01-013'] }] }, {}] });
    expect(legalActions(poor, 0).some((action) => action.type === 'retreat')).toBe(false);
    const alone = mainState({ players: [{ active: tired }, {}] });
    expect(legalActions(alone, 0).some((action) => action.type === 'retreat')).toBe(false);
  });
});

describe('the end of a battle', () => {
  it('is lost by the player who cannot draw at the start of their turn', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-001'] } }, { active: { stack: ['TQQ01-001'] }, deck: [] }] });
    const { state: end } = play(state, { type: 'end-turn' });
    expect(end.phase).toBe('over');
    expect(end.winner).toBe(0);
    expect(end.endReason).toBe('deck-out');
  });

  it('is decided on Memories after the turn limit', () => {
    const lead = mainState({ turn: TURN_LIMIT, players: [{ active: { stack: ['TQQ01-001'] }, memories: 2 }, { active: { stack: ['TQQ01-001'] }, memories: 3 }] });
    const ended = play(lead, { type: 'end-turn' }).state;
    expect(ended).toMatchObject({ phase: 'over', winner: 1, endReason: 'turn-limit' });
    const even = mainState({ turn: TURN_LIMIT, players: [{ active: { stack: ['TQQ01-001'] }, memories: 2 }, { active: { stack: ['TQQ01-001'] }, memories: 2 }] });
    expect(play(even, { type: 'end-turn' }).state).toMatchObject({ winner: 'draw', endReason: 'turn-limit' });
  });

  it('is lost by whoever gives up, at any time', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-001'] } }, { active: { stack: ['TQQ01-001'] } }] });
    const { state: end } = play(state, { type: 'concede', player: 1 });
    expect(end).toMatchObject({ phase: 'over', winner: 0, endReason: 'concede' });
    const setup = createBattle({ decks: DECKS, seed: 'give-up' });
    if (setup.ok) {
      expect(play(setup.state, { type: 'concede', player: 0 }).state.winner).toBe(1);
    }
  });
});

describe('refusing what is not allowed', () => {
  it('leaves the state alone and says why', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-001'] } }, { active: { stack: ['TQQ01-001'] } }] });
    const wrongHand = step(state, { type: 'play-basic', handIndex: 4 });
    expect(wrongHand.ok).toBe(false);
    expect(wrongHand.state).toBe(state);
    expect(wrongHand.ok ? '' : wrongHand.error).toContain('play-basic');
    expect(step(state, ATTACK).ok).toBe(false);
    expect(step(state, { type: 'choose', option: 0 }).ok).toBe(false);
    expect(step(state, { type: 'setup-done', player: 0 }).ok).toBe(false);
  });

  it('only lets the player whose turn it is act, and nobody else while a question is open', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-001'] } }, { active: { stack: ['TQQ01-001'] } }] });
    expect(legalActions(state, 1)).toEqual([]);
    const asked = play(
      mainState({ players: [{ hand: ['TQQ01-067'], active: { stack: ['TQQ01-001'], damage: 10 }, bench: [{ stack: ['TQQ01-013'], damage: 10 }] }, { active: { stack: ['TQQ01-001'] } }] }),
      { type: 'play-supporter', handIndex: 0 },
    );
    expect(asked.state.pending?.player).toBe(0);
    expect(legalActions(asked.state, 0).every((action) => action.type === 'choose')).toBe(true);
    expect(step(asked.state, { type: 'end-turn' }).ok).toBe(false);
  });
});

describe('what a player may know', () => {
  it('hides both decks and the other hand, but not the board or the own hand', () => {
    const state = startedBattle({ decks: DECKS, seed: 'view' });
    const me: PlayerIndex = 0;
    const view = observe(state, me);
    expect(view.players[me].hand).toEqual(state.players[me].hand);
    expect(view.players[1].hand).toHaveLength(state.players[1].hand.length);
    expect(view.players[1].hand.every((card) => card === HIDDEN_CARD)).toBe(true);
    expect(view.players[0].deck.every((card) => card === HIDDEN_CARD)).toBe(true);
    expect(view.players[0].deck).toHaveLength(state.players[0].deck.length);
    expect(view.players[1].active).toEqual(state.players[1].active);
    expect(view.rng).toEqual([0, 0, 0, 0]);
  });

  it('keeps the legal moves of the viewer the same', () => {
    const state = startedBattle({ decks: DECKS, seed: 'view-moves' });
    const actor = state.current;
    expect(legalActions(observe(state, actor), actor)).toEqual(legalActions(state, actor));
  });
});
