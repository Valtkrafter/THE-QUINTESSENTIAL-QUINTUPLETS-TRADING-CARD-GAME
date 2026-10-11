import { describe, expect, it } from 'vitest';
import { legalActions, usableMoves } from './legal';
import { coinSeed, mainState, play } from './testing';
import type { BattleAction, BattleEvent, BattleState } from './types';

const ATTACK: BattleAction = { type: 'attack', moveIndex: 0 };
const SECOND_MOVE: BattleAction = { type: 'attack', moveIndex: 1 };
const choose = (option: number): BattleAction => ({ type: 'choose', option });
const supporter = (handIndex = 0): BattleAction => ({ type: 'play-supporter', handIndex });

const ICHIKA = { stack: ['TQQ01-001'] } as const;
const NINO = { stack: ['TQQ01-013'] } as const;

function eventsOf<T extends BattleEvent['type']>(events: readonly BattleEvent[], type: T): Extract<BattleEvent, { type: T }>[] {
  return events.filter((event): event is Extract<BattleEvent, { type: T }> => event.type === type);
}

function prompt(state: BattleState) {
  return state.pending?.prompt;
}

/** A deck of known cards on top, so a test can say exactly what is drawn. */
const TOP = ['TQQ01-061', 'TQQ01-062', 'TQQ01-063', 'TQQ01-064', 'TQQ01-065', 'TQQ01-066', 'TQQ01-067'] as const;

describe('Supporters that draw', () => {
  it('draw their cards, go to the discard pile and can be played once a turn', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-061', 'TQQ01-062'], active: ICHIKA, deck: TOP }, { active: NINO }] });
    const { state: after, events } = play(state, supporter(0));
    expect(after.players[0].hand).toEqual(['TQQ01-062', 'TQQ01-061', 'TQQ01-062']);
    expect(after.players[0].discard).toEqual(['TQQ01-061']);
    expect(after.players[0].deck).toHaveLength(TOP.length - 2);
    expect(eventsOf(events, 'supporter')).toEqual([{ type: 'supporter', player: 0, cardId: 'TQQ01-061' }]);
    expect(legalActions(after, 0).some((action) => action.type === 'play-supporter')).toBe(false);
  });

  it('draw what is there when the deck is short', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-062'], active: ICHIKA, deck: ['TQQ01-001'] }, { active: NINO }] });
    expect(play(state, supporter()).state.players[0].hand).toEqual(['TQQ01-001']);
  });

  it('flip a coin for Lucky Streak: four cards on heads, one on tails', () => {
    const build = (heads: boolean) => mainState({ seed: coinSeed(heads), players: [{ hand: ['TQQ01-072'], active: ICHIKA, deck: TOP }, { active: NINO }] });
    expect(play(build(true), supporter()).state.players[0].hand).toHaveLength(4);
    expect(play(build(false), supporter()).state.players[0].hand).toHaveLength(1);
  });

  it('shuffle the hand away and draw again: Kyoto Memory, Carefree Father, Surprise Visit', () => {
    const hand = ['TQQ01-066', 'TQQ01-001', 'TQQ01-013'];
    const kyoto = play(mainState({ players: [{ hand, active: ICHIKA, deck: TOP }, { active: NINO }] }), supporter()).state;
    expect(kyoto.players[0].hand).toHaveLength(6);
    expect(kyoto.players[0].deck).toHaveLength(TOP.length + 2 - 6);

    const both = play(
      mainState({ players: [{ hand: ['TQQ01-071', 'TQQ01-001'], active: ICHIKA, deck: TOP }, { hand: ['TQQ01-013', 'TQQ01-013', 'TQQ01-013'], active: NINO, deck: TOP }] }),
      supporter(),
    ).state;
    expect(both.players[0].hand).toHaveLength(4);
    expect(both.players[1].hand).toHaveLength(4);

    const visit = play(
      mainState({ players: [{ hand: ['TQQ01-073', 'TQQ01-001'], active: ICHIKA, deck: TOP }, { hand: ['TQQ01-013', 'TQQ01-013', 'TQQ01-013', 'TQQ01-013'], active: NINO, deck: TOP }] }),
      supporter(),
    ).state;
    expect(visit.players[0].hand).toEqual(['TQQ01-001']);
    expect(visit.players[1].hand).toHaveLength(3);
  });
});

describe('Supporters that heal', () => {
  const hurt = { stack: ['TQQ01-001'], damage: 40 } as const;
  const slightlyHurt = { stack: ['TQQ01-013'], damage: 20 } as const;

  it('ask which Character when several are hurt', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-067'], active: hurt, bench: [slightlyHurt, NINO] }, { active: NINO }] });
    const asked = play(state, supporter());
    expect(prompt(asked.state)).toMatchObject({ kind: 'figure', reason: 'heal', owner: 0, optional: false });
    expect(prompt(asked.state)?.kind === 'figure' && prompt(asked.state)).toMatchObject({ options: [{ zone: 'active' }, { zone: 'bench', index: 0 }] });
    const answered = play(asked.state, choose(1));
    expect(answered.state.players[0].bench[0]?.damage).toBe(0);
    expect(answered.state.players[0].active?.damage).toBe(40);
    expect(eventsOf(answered.events, 'heal')).toEqual([{ type: 'heal', player: 0, target: { zone: 'bench', index: 0 }, amount: 20 }]);
    expect(answered.state.pending).toBeNull();
  });

  it('do not ask when only one Character is hurt, or when nobody is', () => {
    const one = play(mainState({ players: [{ hand: ['TQQ01-068'], active: hurt, bench: [NINO] }, { active: NINO }] }), supporter());
    expect(one.state.pending).toBeNull();
    expect(one.state.players[0].active?.damage).toBe(0);
    const none = play(mainState({ players: [{ hand: ['TQQ01-068'], active: ICHIKA }, { active: NINO }] }), supporter());
    expect(none.state.pending).toBeNull();
    expect(eventsOf(none.events, 'heal')).toEqual([]);
    expect(none.state.players[0].supporterPlayed).toBe(true);
  });

  it('heal everybody for Sweet Surprise, and heal and then draw for Study Snack and Second Place', () => {
    const all = play(mainState({ players: [{ hand: ['TQQ01-069'], active: hurt, bench: [slightlyHurt] }, { active: NINO }] }), supporter()).state;
    expect(all.players[0].active?.damage).toBe(20);
    expect(all.players[0].bench[0]?.damage).toBe(0);

    const snack = mainState({ players: [{ hand: ['TQQ01-063'], active: hurt, bench: [slightlyHurt], deck: TOP }, { active: NINO }] });
    const asked = play(snack, supporter());
    expect(asked.state.pending?.step.kind).toBe('effect');
    const done = play(asked.state, choose(0));
    expect(done.state.players[0].active?.damage).toBe(10);
    expect(done.state.players[0].hand).toEqual(['TQQ01-061']);

    const second = play(mainState({ players: [{ hand: ['TQQ01-079'], active: hurt, deck: TOP }, { active: NINO }] }), supporter()).state;
    expect(second.players[0].hand).toHaveLength(3);
    expect(second.players[0].active?.damage).toBe(20);
  });
});

describe('Supporters that give Hearts, switch or protect', () => {
  it('gives two Hearts to a Character of choice for New Year Hakama', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-064'], active: ICHIKA, bench: [NINO] }, { active: NINO }] });
    const asked = play(state, supporter());
    expect(prompt(asked.state)).toMatchObject({ kind: 'figure', reason: 'give-heart' });
    const done = play(asked.state, choose(1));
    expect(done.state.players[0].bench[0]?.hearts).toBe(2);
    expect(done.state.players[0].active?.hearts).toBe(0);
  });

  it('lets the player pick which enemy Character comes to the front for Hospital Director', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-074'], active: ICHIKA }, { active: NINO, bench: [{ stack: ['TQQ01-025'] }, { stack: ['TQQ01-037'] }] }] });
    const asked = play(state, supporter());
    expect(asked.state.pending?.player).toBe(0);
    expect(prompt(asked.state)).toMatchObject({ kind: 'figure', reason: 'send-to-front', owner: 1 });
    const done = play(asked.state, choose(1));
    expect(done.state.players[1].active?.stack).toEqual(['TQQ01-037']);
    expect(done.state.players[1].bench[1]?.stack).toEqual(['TQQ01-013']);
    const alone = play(mainState({ players: [{ hand: ['TQQ01-074'], active: ICHIKA }, { active: NINO, bench: [{ stack: ['TQQ01-025'] }] }] }), supporter());
    expect(alone.state.pending).toBeNull();
    expect(alone.state.players[1].active?.stack).toEqual(['TQQ01-025']);
  });

  it('protects the Active Character during the next turn of the opponent: Overprotective Father', () => {
    const state = mainState({ turn: 7, players: [{ hand: ['TQQ01-076'], active: ICHIKA }, { active: { stack: ['TQQ01-013'], hearts: 1 } }] });
    const shielded = play(state, supporter(), { type: 'end-turn' });
    expect(shielded.state.players[0].shieldTurn).toBe(8);
    const hit = play(shielded.state, ATTACK);
    expect(hit.state.players[0].active?.damage).toBe(0);
    expect(eventsOf(hit.events, 'attack')[0]).toMatchObject({ blocked: true, damage: 0 });
  });
});

describe('Supporters that search', () => {
  const deck = ['TQQ01-050', 'TQQ01-001', 'TQQ01-001', 'TQQ01-004', 'TQQ01-078', 'TQQ01-013', 'TQQ01-062'];

  it('find a Basic Character for the Bench and shuffle the deck: Autumn in Kyoto', () => {
    const state = mainState({ turn: 7, players: [{ hand: ['TQQ01-065'], active: ICHIKA, deck }, { active: NINO }] });
    const asked = play(state, supporter());
    // Each different Basic is listed once, with the place of its first copy.
    expect(prompt(asked.state)).toMatchObject({
      kind: 'card',
      reason: 'find-basic',
      optional: true,
      options: [
        { index: 0, cardId: 'TQQ01-050' },
        { index: 1, cardId: 'TQQ01-001' },
        { index: 5, cardId: 'TQQ01-013' },
      ],
    });
    const done = play(asked.state, choose(1));
    expect(done.state.players[0].bench.map((figure) => figure.stack)).toEqual([['TQQ01-001']]);
    expect(done.state.players[0].bench[0]?.arrivedTurn).toBe(7);
    expect(done.state.players[0].deck).toHaveLength(deck.length - 1);
    expect(eventsOf(done.events, 'shuffle')).toHaveLength(1);
  });

  it('may find nothing', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-065'], active: ICHIKA, deck }, { active: NINO }] });
    const done = play(play(state, supporter()).state, choose(-1));
    expect(done.state.players[0].bench).toEqual([]);
    expect(done.state.players[0].deck).toHaveLength(deck.length);
    expect(done.state.pending).toBeNull();
  });

  it('find up to two for Festival Night, and stop when the Bench is full', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-070'], active: ICHIKA, deck }, { active: NINO }] });
    const first = play(play(state, supporter()).state, choose(0));
    expect(prompt(first.state)).toMatchObject({ kind: 'card', reason: 'find-basic' });
    const second = play(first.state, choose(0));
    expect(second.state.players[0].bench).toHaveLength(2);
    expect(second.state.pending).toBeNull();

    const crowded = mainState({ players: [{ hand: ['TQQ01-070'], active: ICHIKA, bench: [NINO, NINO], deck }, { active: NINO }] });
    const after = play(play(crowded, supporter()).state, choose(0));
    expect(after.state.players[0].bench).toHaveLength(3);
    expect(after.state.pending).toBeNull();
  });

  it('find a Supporter for Top Marks', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-078'], active: ICHIKA, deck }, { active: NINO }] });
    const asked = play(state, supporter());
    expect(prompt(asked.state)).toMatchObject({ kind: 'card', reason: 'find-supporter', options: [{ index: 4, cardId: 'TQQ01-078' }, { index: 6, cardId: 'TQQ01-062' }] });
    const done = play(asked.state, choose(1));
    expect(done.state.players[0].hand).toEqual(['TQQ01-062']);
  });

  it('look at the top five cards, take one and put the rest at the bottom in order: The Rival', () => {
    const state = mainState({ players: [{ hand: ['TQQ01-077'], active: ICHIKA, deck: TOP }, { active: NINO }] });
    const asked = play(state, supporter());
    expect(prompt(asked.state)).toMatchObject({ kind: 'card', reason: 'take-from-top', optional: false });
    expect(prompt(asked.state)?.kind === 'card' && prompt(asked.state)).toMatchObject({ options: TOP.slice(0, 5).map((cardId, index) => ({ index, cardId })) });
    const done = play(asked.state, choose(2));
    expect(done.state.players[0].hand).toEqual(['TQQ01-063']);
    expect(done.state.players[0].deck).toEqual(['TQQ01-066', 'TQQ01-067', 'TQQ01-061', 'TQQ01-062', 'TQQ01-064', 'TQQ01-065']);
  });
});

describe('abilities', () => {
  it('swap the Active Character with a Benched one, once a turn: Leading Lady', () => {
    const state = mainState({ turn: 7, players: [{ active: { stack: ['TQQ01-001', 'TQQ01-004', 'TQQ01-005'] }, bench: [NINO, { stack: ['TQQ01-025'] }] }, { active: NINO }] });
    expect(legalActions(state, 0)).toContainEqual({ type: 'use-ability', figure: { zone: 'active' } });
    const asked = play(state, { type: 'use-ability', figure: { zone: 'active' } });
    expect(prompt(asked.state)).toMatchObject({ kind: 'figure', reason: 'swap-in', owner: 0 });
    const done = play(asked.state, choose(1));
    expect(done.state.players[0].active?.stack).toEqual(['TQQ01-025']);
    const used = done.state.players[0].bench[1];
    expect(used?.abilityTurn).toBe(7);
    expect(legalActions(done.state, 0).some((action) => action.type === 'use-ability')).toBe(false);
  });

  it('are not offered when they could do nothing', () => {
    const alone = mainState({ players: [{ active: { stack: ['TQQ01-001', 'TQQ01-004', 'TQQ01-005'] } }, { active: NINO }] });
    expect(legalActions(alone, 0).some((action) => action.type === 'use-ability')).toBe(false);
    const care = { stack: ['TQQ01-013', 'TQQ01-016', 'TQQ01-017'] } as const;
    const nobodyHurt = mainState({ players: [{ active: ICHIKA, bench: [care, NINO] }, { active: NINO }] });
    expect(legalActions(nobodyHurt, 0).some((action) => action.type === 'use-ability')).toBe(false);
    const somebodyHurt = mainState({ players: [{ active: ICHIKA, bench: [care, { stack: NINO.stack, damage: 20 }] }, { active: NINO }] });
    expect(legalActions(somebodyHurt, 0).filter((action) => action.type === 'use-ability')).toEqual([{ type: 'use-ability', figure: { zone: 'bench', index: 0 } }]);
  });

  it('heal the Bench: Big Sister\'s Care', () => {
    const state = mainState({
      players: [{ active: { stack: ['TQQ01-013', 'TQQ01-016', 'TQQ01-017'], damage: 30 }, bench: [{ stack: ['TQQ01-001'], damage: 50 }, NINO] }, { active: NINO }],
    });
    const done = play(state, { type: 'use-ability', figure: { zone: 'active' } }).state;
    expect(done.players[0].bench[0]?.damage).toBe(30);
    expect(done.players[0].active?.damage).toBe(30);
  });

  it('give a Heart to themselves and draw a card: Candy Run, Future Teacher', () => {
    const candy = mainState({ players: [{ active: ICHIKA, bench: [{ stack: ['TQQ01-047'] }] }, { active: NINO }] });
    const given = play(candy, { type: 'use-ability', figure: { zone: 'bench', index: 0 } }).state;
    expect(given.players[0].bench[0]?.hearts).toBe(1);
    const teacher = mainState({ players: [{ active: { stack: ['TQQ01-049', 'TQQ01-052', 'TQQ01-053'] }, deck: TOP }, { active: NINO }] });
    expect(play(teacher, { type: 'use-ability', figure: { zone: 'active' } }).state.players[0].hand).toEqual(['TQQ01-061']);
  });

  it('let the player look at the top card and decide: Spotlight', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-008'] }, deck: TOP }, { active: NINO }] });
    const asked = play(state, { type: 'use-ability', figure: { zone: 'active' } });
    expect(prompt(asked.state)).toEqual({ kind: 'yes-no', reason: 'move-to-bottom', cardId: 'TQQ01-061' });
    expect(play(asked.state, choose(0)).state.players[0].deck).toEqual([...TOP.slice(1), 'TQQ01-061']);
    expect(play(asked.state, choose(1)).state.players[0].deck).toEqual([...TOP]);
  });

  it('work when an Event card is played from the hand: Sweet Treats and Candy Feast', () => {
    const treats = mainState({ players: [{ hand: ['TQQ01-023'], active: { stack: ['TQQ01-001'], damage: 50 }, bench: [{ stack: ['TQQ01-013'], damage: 20 }] }, { active: NINO }] });
    const healed = play(treats, { type: 'play-basic', handIndex: 0 }).state;
    expect(healed.players[0].active?.damage).toBe(20);
    expect(healed.players[0].bench[0]?.damage).toBe(0);
    const feast = mainState({ players: [{ hand: ['TQQ01-059', 'TQQ01-001'], active: ICHIKA, deck: TOP }, { active: NINO }] });
    expect(play(feast, { type: 'play-basic', handIndex: 0 }).state.players[0].hand).toHaveLength(6);
  });

  it('lower what the Active Character pays when a Yotsuba waits on the Bench: Ribbon of Support', () => {
    const closeIchika = { stack: ['TQQ01-001', 'TQQ01-004'], hearts: 2 } as const;
    const helper = { stack: ['TQQ01-037', 'TQQ01-040', 'TQQ01-041'] } as const;
    const without = mainState({ players: [{ active: closeIchika, bench: [NINO] }, { active: NINO }] });
    expect(usableMoves(without, 0)).toEqual([]);
    const withHelper = mainState({ players: [{ active: closeIchika, bench: [helper] }, { active: NINO }] });
    expect(usableMoves(withHelper, 0)).toEqual([0]);
  });
});

describe('effects of moves', () => {
  it('heal the attacker after the damage: Quiet Night', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-002'], hearts: 1, damage: 30 } }, { active: { stack: ['TQQ01-037'] } }] });
    const { state: after } = play(state, ATTACK);
    expect(after.players[0].active?.damage).toBe(20);
    expect(after.players[1].active?.damage).toBe(10);
  });

  it('draw cards after the damage: Kitchen Command', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-013', 'TQQ01-016', 'TQQ01-018'], hearts: 1 }, deck: TOP }, { active: { stack: ['TQQ01-049'] } }] });
    const { state: after } = play(state, ATTACK);
    expect(after.players[0].hand).toEqual(['TQQ01-061', 'TQQ01-062']);
    expect(after.players[1].active?.damage).toBe(40);
  });

  it('heal one Character of choice with the second move of Pâtissière', () => {
    const state = mainState({
      players: [{ active: { stack: ['TQQ01-015'], hearts: 2 }, bench: [{ stack: ['TQQ01-001'], damage: 40 }, { stack: ['TQQ01-013'], damage: 10 }] }, { active: { stack: ['TQQ01-037'] } }],
    });
    const asked = play(state, SECOND_MOVE);
    expect(prompt(asked.state)).toMatchObject({ kind: 'figure', reason: 'heal' });
    expect(asked.state.attacking).toBe(0);
    const done = play(asked.state, choose(0));
    expect(done.state.players[0].bench[0]?.damage).toBe(10);
    expect(done.state.current).toBe(1);
    expect(done.state.attacking).toBeNull();
  });

  it('keep the attacker\'s turn open until the question about "peek at the top card" is answered', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-003'], hearts: 2 }, deck: TOP }, { active: { stack: ['TQQ01-037'] } }] });
    const asked = play(state, SECOND_MOVE);
    expect(asked.state.current).toBe(0);
    expect(asked.state.pending?.player).toBe(0);
    const done = play(asked.state, choose(1));
    expect(done.state.current).toBe(1);
  });

  it('can stun the enemy Active Character by luck: Sengoku Trivia', () => {
    const attacker = { stack: ['TQQ01-027'], hearts: 2 } as const;
    const target = { stack: ['TQQ01-037'] } as const;
    const lucky = play(mainState({ turn: 7, seed: coinSeed(true), players: [{ active: attacker }, { active: { ...target, hearts: 3 } }] }), SECOND_MOVE);
    expect(eventsOf(lucky.events, 'stun')).toEqual([{ type: 'stun', player: 1 }]);
    expect(lucky.state.players[1].active?.stunTurn).toBe(8);
    // It is the stunned Character's player's turn now, and it cannot attack.
    expect(usableMoves(lucky.state, 1)).toEqual([]);
    const unlucky = play(mainState({ turn: 7, seed: coinSeed(false), players: [{ active: attacker }, { active: { ...target, hearts: 3 } }] }), SECOND_MOVE);
    expect(eventsOf(unlucky.events, 'stun')).toEqual([]);
    expect(usableMoves(unlucky.state, 1)).toEqual([0]);
  });

  it('stun without a coin: Haunting Melody', () => {
    const state = mainState({ turn: 7, players: [{ active: { stack: ['TQQ01-036'], hearts: 2 } }, { active: { stack: ['TQQ01-037'], hearts: 3 } }] });
    expect(usableMoves(play(state, ATTACK).state, 1)).toEqual([]);
  });

  it('take Hearts off the defender: Black Cat Scratch and Starving Ghost', () => {
    const bride = { stack: ['TQQ01-001', 'TQQ01-004', 'TQQ01-010'], hearts: 2 } as const;
    const cat = play(mainState({ players: [{ active: { stack: ['TQQ01-012'], hearts: 2 } }, { active: bride }] }), ATTACK);
    expect(cat.state.players[1].active?.hearts).toBe(1);
    expect(eventsOf(cat.events, 'hearts-removed')).toEqual([{ type: 'hearts-removed', player: 1, count: 1 }]);
    const ghost = play(mainState({ players: [{ active: { stack: ['TQQ01-060'], hearts: 2 } }, { active: { ...bride, hearts: 1 } }] }), ATTACK);
    expect(ghost.state.players[1].active?.hearts).toBe(0);
    expect(eventsOf(ghost.events, 'hearts-removed')).toEqual([{ type: 'hearts-removed', player: 1, count: 1 }]);
  });

  it('give a Heart to a Benched Character: Hop Along', () => {
    const many = mainState({ players: [{ active: { stack: ['TQQ01-038'], hearts: 1 }, bench: [NINO, ICHIKA] }, { active: NINO }] });
    const asked = play(many, ATTACK);
    expect(prompt(asked.state)).toMatchObject({ kind: 'figure', reason: 'give-heart', options: [{ zone: 'bench', index: 0 }, { zone: 'bench', index: 1 }] });
    const done = play(asked.state, choose(1));
    expect(done.state.players[0].bench[1]?.hearts).toBe(1);
    expect(done.state.current).toBe(1);
    const one = play(mainState({ players: [{ active: { stack: ['TQQ01-038'], hearts: 1 }, bench: [NINO] }, { active: NINO }] }), ATTACK);
    expect(one.state.pending).toBeNull();
    expect(one.state.players[0].bench[0]?.hearts).toBe(1);
    const none = play(mainState({ players: [{ active: { stack: ['TQQ01-038'], hearts: 1 } }, { active: NINO }] }), ATTACK);
    expect(none.state.pending).toBeNull();
  });

  it('split two Hearts any way the player likes, and stop early if wanted: Cheer Squad', () => {
    const squad = { stack: ['TQQ01-037', 'TQQ01-040', 'TQQ01-042'], hearts: 1 } as const;
    const state = mainState({ players: [{ active: squad, bench: [NINO, ICHIKA] }, { active: NINO }] });
    expect(usableMoves(state, 0)).toEqual([0]);
    const first = play(state, ATTACK);
    expect(prompt(first.state)).toMatchObject({ kind: 'figure', reason: 'give-heart', optional: true });
    expect(legalActions(first.state, 0)).toContainEqual(choose(-1));
    const second = play(first.state, choose(2));
    expect(second.state.players[0].bench[1]?.hearts).toBe(1);
    expect(prompt(second.state)).toMatchObject({ kind: 'figure', reason: 'give-heart', optional: true });
    const done = play(second.state, choose(2));
    expect(done.state.players[0].bench[1]?.hearts).toBe(2);
    expect(done.state.current).toBe(1);

    const early = play(second.state, choose(-1));
    expect(early.state.players[0].bench[1]?.hearts).toBe(1);
    expect(early.state.pending).toBeNull();
    expect(early.state.current).toBe(1);
  });

  it('do no damage when the move has none', () => {
    const state = mainState({ players: [{ active: { stack: ['TQQ01-037', 'TQQ01-040', 'TQQ01-042'], hearts: 1 } }, { active: NINO }] });
    const first = play(state, ATTACK);
    expect(eventsOf(first.events, 'attack')[0]).toMatchObject({ damage: 0 });
    expect(first.state.players[1].active?.damage).toBe(0);
  });
});
