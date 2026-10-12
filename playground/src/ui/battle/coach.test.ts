import { describe, expect, it } from 'vitest';
import { legalActions } from '../../battle/legal';
import { FREE_HEARTS_PER_TURN } from '../../battle/rules';
import { mainState, play } from '../../battle/testing';
import { captionFor, setupGuide, turnGuide, type CaptionInput, type TurnGuide } from './coach';
import { heartsLeft } from './viewModel';

const NINO = { stack: ['TQQ01-013'] } as const;
// Ichika (Basic, Close), a Basic of Nino and a Supporter that draws cards.
const HAND = ['TQQ01-013', 'TQQ01-004', 'TQQ01-067'];

function guideOf(state: ReturnType<typeof mainState>): TurnGuide {
  return turnGuide(state, legalActions(state, 0), 0);
}

function statuses(guide: TurnGuide): Record<string, string> {
  return Object.fromEntries(guide.steps.map((entry) => [entry.id, entry.status]));
}

describe('the steps of a turn', () => {
  it('lists the six steps in the order of the turn, the draw first and the attack last', () => {
    const guide = guideOf(mainState({ players: [{ hand: HAND, active: { stack: ['TQQ01-001'], hearts: 1 } }, { active: NINO }] }));
    expect(guide.steps.map((entry) => entry.id)).toEqual(['draw', 'heart', 'bench', 'evolve', 'supporter', 'attack']);
  });

  it('says what can be done now: the Heart, the Bench, an evolution, a Supporter and an attack', () => {
    const state = mainState({ players: [{ hand: HAND, active: { stack: ['TQQ01-001'], hearts: 1 }, bench: [] }, { active: NINO }] });
    expect(statuses(guideOf(state))).toEqual({ draw: 'done', heart: 'ready', bench: 'ready', evolve: 'ready', supporter: 'ready', attack: 'ready' });
  });

  it('points to the free Heart first, then on step by step as things are done', () => {
    let state = mainState({ players: [{ hand: HAND, active: { stack: ['TQQ01-001'], hearts: 3 } }, { active: NINO }] });
    expect(guideOf(state).next).toBe('heart');
    state = play(state, { type: 'give-heart', target: { zone: 'active' } }).state;
    // Two free Hearts a turn: one is given, one is left.
    expect(statuses(guideOf(state))['heart']).toBe('ready');
    expect(heartsLeft(state, 0)).toBe(1);
    state = play(state, { type: 'give-heart', target: { zone: 'active' } }).state;
    expect(statuses(guideOf(state))['heart']).toBe('done');
    expect(heartsLeft(state, 0)).toBe(0);
    expect(guideOf(state).next).toBe('bench');
    state = play(state, { type: 'play-basic', handIndex: 0 }).state;
    expect(guideOf(state).next).toBe('evolve');
    state = play(state, { type: 'evolve', handIndex: 0, target: { zone: 'active' } }).state;
    expect(guideOf(state).next).toBe('supporter');
    state = play(state, { type: 'play-supporter', handIndex: 0 }).state;
    expect(statuses(guideOf(state))['supporter']).toBe('done');
    expect(guideOf(state).next).toBe('attack');
  });

  it('has nothing to point to when only an end of the turn is left', () => {
    const guide = guideOf(mainState({ players: [{ hand: [], active: { stack: ['TQQ01-001'], hearts: 0 }, heartsGiven: FREE_HEARTS_PER_TURN }, { active: NINO }] }));
    expect(guide.next).toBeNull();
    expect(statuses(guide)['attack']).toBe('blocked');
  });

  it('blocks the attack for the player who goes first in the first turn', () => {
    const state = mainState({ first: 0, turn: 1, players: [{ hand: [], turnsTaken: 1, active: { stack: ['TQQ01-001'], hearts: 3 } }, { active: NINO }] });
    expect(statuses(guideOf(state))['attack']).toBe('blocked');
  });
});

describe('the steps of the setup', () => {
  it('asks for a Character in front, then for the Bench, then for Ready', () => {
    const empty = mainState({ players: [{ hand: HAND, active: null }, { active: NINO }] });
    const setupState = { ...empty, phase: 'setup' as const, players: [{ ...empty.players[0], setupDone: false }, empty.players[1]] as const };
    expect(setupGuide(setupState, legalActions(setupState, 0), 0).next).toBe('active');
    const placed = play(setupState, { type: 'setup-place', player: 0, handIndex: 0, to: 'active' }).state;
    const guide = setupGuide(placed, legalActions(placed, 0), 0);
    expect(guide.steps.map((entry) => `${entry.id}:${entry.status}`)).toEqual(['active:done', 'bench:blocked', 'ready:ready']);
    expect(guide.next).toBe('ready');
  });
});

describe('the sentence under the table', () => {
  const base: CaptionInput = {
    mood: 'your-turn',
    rival: 'Raiha',
    promptTitle: null,
    promptKind: null,
    guide: { steps: [], next: null },
    setup: { steps: [], next: null },
    heartsLeft: 0,
    heartPicked: false,
    handPick: null,
    figurePicked: false,
    noAttackYet: false,
    stunned: false,
    lastLine: null,
    rivalReady: false,
    benchFree: 3,
  };

  it('follows the step the guide points to', () => {
    const next = (id: TurnGuide['next']) => captionFor({ ...base, guide: { steps: [], next: id } }).text;
    expect(next('heart')).toMatch(/free Heart/);
    expect(next('bench')).toMatch(/Bench/);
    expect(next('evolve')).toMatch(/evolve/);
    expect(next('supporter')).toMatch(/Supporter/);
    expect(next('attack')).toMatch(/attack/i);
    expect(new Set([next('heart'), next('bench'), next('evolve'), next('supporter'), next('attack')]).size).toBe(5);
  });

  it('asks the question the engine asks before anything else', () => {
    const caption = captionFor({ ...base, promptTitle: 'Choose a Character to heal', promptKind: 'figure', guide: { steps: [], next: 'heart' } });
    expect(caption).toMatchObject({ title: 'Choose a Character to heal', tone: 'ask' });
    expect(caption.text).toMatch(/glowing/);
    expect(captionFor({ ...base, promptTitle: 'Take one of these cards', promptKind: 'card' }).text).toMatch(/Choose one of the cards/);
  });

  it('says what the picked thing needs: a Character for the Heart, a target for an evolution, the button for a Supporter', () => {
    expect(captionFor({ ...base, heartPicked: true }).text).toMatch(/Click a glowing Character to give it the Heart/);
    expect(captionFor({ ...base, handPick: 'evolve' }).text).toMatch(/evolve it/);
    expect(captionFor({ ...base, handPick: 'supporter' }).text).toMatch(/Play Supporter/);
    expect(captionFor({ ...base, figurePicked: true }).text).toMatch(/buttons/);
  });

  it('tells the story of the setup', () => {
    const setup = (next: CaptionInput['setup']['next'], extra: Partial<CaptionInput> = {}) => captionFor({ ...base, mood: 'setup', setup: { steps: [], next }, ...extra });
    expect(setup('active').text).toMatch(/put it in front/);
    expect(setup('bench', { benchFree: 3 }).text).toMatch(/up to 3 more Characters/);
    expect(setup('bench', { benchFree: 1 }).text).toMatch(/up to 1 more Character on/);
    expect(setup('ready').text).toMatch(/Press Ready/);
    expect(setup('ready', { rivalReady: true }).text).toMatch(/Raiha is ready/);
  });

  it('shows what the rival does while it plays, and a waiting line before it has done anything', () => {
    expect(captionFor({ ...base, mood: 'their-turn', lastLine: 'Raiha gave a Heart to Nino.' })).toMatchObject({ title: 'Raiha is playing', text: 'Raiha gave a Heart to Nino.', tone: 'wait' });
    expect(captionFor({ ...base, mood: 'their-turn' }).text).toBe('Raiha is thinking …');
  });

  it('explains why there is nothing to do at the end of a turn', () => {
    expect(captionFor({ ...base, noAttackYet: true }).text).toMatch(/You go first/);
    expect(captionFor({ ...base, stunned: true }).text).toMatch(/cannot attack/);
    const blocked: TurnGuide = { steps: [{ id: 'attack', status: 'blocked' }], next: null };
    expect(captionFor({ ...base, guide: blocked }).text).toMatch(/moves need Hearts/);
    expect(captionFor({ ...base, guide: { steps: [{ id: 'attack', status: 'done' }], next: null } }).text).toMatch(/Nothing left to do/);
  });

  it('writes no empty sentence while the battle goes on', () => {
    for (const mood of ['setup', 'your-turn', 'their-turn'] as const) {
      const caption = captionFor({ ...base, mood });
      expect(caption.title.length).toBeGreaterThan(0);
      expect(caption.text.length).toBeGreaterThan(0);
    }
  });
});
