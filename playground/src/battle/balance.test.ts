import { describe, expect, it } from 'vitest';
import { AI_LEVELS, type AiLevel } from './ai';
import { freeHearts } from './rules';
import { OPPONENTS, STARTER_DECKS } from './roster';
import { playMany, playMatch } from './simulate';
import { lineDeck, simpleDeck } from './testing';
import type { BattleState } from './types';

const SISTERS = ['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'] as const;

describe('computer opponents', () => {
  it('play whole battles to the end without one illegal move, at every level', () => {
    for (const levels of [
      ['easy', 'easy'],
      ['normal', 'normal'],
      ['hard', 'hard'],
      ['easy', 'hard'],
    ] as const) {
      for (let game = 0; game < 4; game += 1) {
        const sister = SISTERS[game % SISTERS.length] ?? 'ichika';
        const other = SISTERS[(game + 2) % SISTERS.length] ?? 'nino';
        const result = playMatch({ decks: [lineDeck(sister), simpleDeck(other)], levels, seed: `smoke:${levels.join('-')}:${game}` });
        expect(result.state.phase).toBe('over');
      }
    }
  }, 120_000);

  it('are repeatable: the same seed gives the same battle', () => {
    const setup = { decks: [lineDeck('ichika'), lineDeck('miku')], levels: ['normal', 'hard'], seed: 'again' } as const;
    const a = playMatch(setup);
    const b = playMatch(setup);
    expect(b.state).toEqual(a.state);
  });

  it('win more often the higher their level is', () => {
    const decks = [lineDeck('ichika'), lineDeck('ichika')] as const;
    const tally = playMany({ decks, levels: ['normal', 'easy'] }, 30, 'level-check');
    // Checked loosely: 30 games are not many, and the report below measures it properly.
    expect(tally.wins[0]).toBeGreaterThan(tally.wins[1]);
  }, 120_000);
});

function percent(part: number, whole: number): string {
  return `${Math.round((part / Math.max(whole, 1)) * 100)}%`;
}

/** The balance report: `SIM=1 npx vitest run src/battle/balance.test.ts --reporter=verbose`. It prints tables and asserts nothing. */
describe.skipIf(process.env['SIM'] === undefined)('balance report', () => {
  const games = Number(process.env['SIM_GAMES'] ?? 60);

  it('prints how the levels do against each other and how long battles last', () => {
    const lines: string[] = [];
    for (const a of AI_LEVELS) {
      for (const b of AI_LEVELS) {
        if (AI_LEVELS.indexOf(a) > AI_LEVELS.indexOf(b)) {
          continue;
        }
        let aWins = 0;
        let bWins = 0;
        let turns = 0;
        let played = 0;
        let firstWins = 0;
        const reasons: Record<string, number> = {};
        for (const sister of SISTERS) {
          const tally = playMany({ decks: [lineDeck(sister), lineDeck(sister)], levels: [a as AiLevel, b as AiLevel] }, Math.ceil(games / SISTERS.length), `${a}-${b}-${sister}`);
          aWins += tally.wins[0];
          bWins += tally.wins[1];
          turns += tally.averageTurns * tally.games;
          played += tally.games;
          firstWins += tally.firstPlayerWins;
          for (const [reason, count] of Object.entries(tally.reasons)) {
            reasons[reason] = (reasons[reason] ?? 0) + count;
          }
        }
        lines.push(`${a} vs ${b} (mirror line decks): ${aWins}-${bWins} of ${played}, first player won ${percent(firstWins, played)}, ${(turns / played).toFixed(1)} turns, ${JSON.stringify(reasons)}`);
      }
    }
    console.log(`\n${lines.join('\n')}`);
  }, 600_000);

  it('prints how long battles last', () => {
    const lengths: number[] = [];
    const reasons: Record<string, number> = {};
    for (const row of SISTERS) {
      for (const column of SISTERS) {
        for (let game = 0; game < Math.ceil(games / 5); game += 1) {
          const result = playMatch({ decks: [lineDeck(row), lineDeck(column)], levels: ['normal', 'normal'], seed: `length-${row}-${column}-${game}` });
          lengths.push(result.turns);
          reasons[result.reason] = (reasons[result.reason] ?? 0) + 1;
        }
      }
    }
    lengths.sort((a, b) => a - b);
    const at = (fraction: number): number => lengths[Math.min(lengths.length - 1, Math.floor(lengths.length * fraction))] ?? 0;
    const early = lengths.filter((turns) => turns <= 6).length;
    console.log(`\nturns of both players: min ${at(0)}, 10% ${at(0.1)}, median ${at(0.5)}, 90% ${at(0.9)}, max ${lengths.at(-1)}; over by turn 6: ${percent(early, lengths.length)}; ${JSON.stringify(reasons)}`);
  }, 600_000);

  it('prints how the Hearts are used', () => {
    // Per player and turn: how many free Hearts were left unused, how often the Active Character attacked, what a move cost and
    // did, and how many Hearts sat on the Characters when the battle ended.
    let turns = 0;
    let attacks = 0;
    let spent = 0;
    let damage = 0;
    let given = 0;
    let unused = 0;
    let retreats = 0;
    let leftOver = 0;
    let battles = 0;
    for (const row of SISTERS) {
      for (const column of SISTERS) {
        for (let game = 0; game < Math.ceil(games / 10); game += 1) {
          let previous: BattleState | null = null;
          const result = playMatch({ decks: [lineDeck(row), lineDeck(column)], levels: ['normal', 'normal'], seed: `hearts-${row}-${column}-${game}` }, (events, state) => {
            for (const event of events) {
              if (event.type === 'turn') {
                turns += 1;
                if (previous !== null && previous.phase === 'main') {
                  const before = previous.players[previous.current];
                  unused += Math.max(0, freeHearts(previous, previous.current) - before.heartsGiven);
                }
              } else if (event.type === 'attack') {
                attacks += 1;
                spent += event.spent;
                damage += event.damage;
              } else if (event.type === 'heart') {
                given += event.count;
              } else if (event.type === 'retreat') {
                retreats += 1;
              }
            }
            previous = state;
          });
          battles += 1;
          for (const player of result.state.players) {
            leftOver += [player.active, ...player.bench].reduce((sum, figure) => sum + (figure?.hearts ?? 0), 0);
          }
        }
      }
    }
    const per = (value: number, by: number): string => (value / Math.max(by, 1)).toFixed(2);
    console.log(
      `
Hearts (normal vs normal, ${battles} battles, ${turns} turns): attack in ${percent(attacks, turns)} of the turns, a move costs ${per(spent, attacks)} Hearts and does ${per(damage, attacks)} damage, ` +
        `${per(damage, turns)} damage per turn, ${per(given, turns)} Hearts given and ${per(unused, turns)} free Hearts unused per turn, ${per(retreats, turns)} retreats per turn, ${per(leftOver, battles)} Hearts left on the table at the end`,
    );
  }, 600_000);

  it('prints how the starter decks (played normally) do against the rivals', () => {
    const rows: string[] = [`starter deck wins against rival (starter played at normal level, ${games} games each)`, `${''.padEnd(18)}${OPPONENTS.map((opponent) => `${opponent.id}/${opponent.level}`.padEnd(15)).join('')}`];
    for (const starter of STARTER_DECKS) {
      const cells: string[] = [];
      for (const opponent of OPPONENTS) {
        const tally = playMany({ decks: [starter.cards, opponent.deck.cards], levels: ['normal', opponent.level] }, games, `starter-${starter.id}-${opponent.id}`);
        cells.push(percent(tally.wins[0], tally.games - tally.draws).padEnd(15));
      }
      rows.push(`${starter.id.padEnd(18)}${cells.join('')}`);
    }
    console.log(`\n${rows.join('\n')}`);
  }, 600_000);

  it('prints the matchups between the five line decks', () => {
    const rows: string[] = [`row wins against column (normal vs normal, ${games} games each)`, `          ${SISTERS.map((name) => name.padEnd(8)).join(' ')}`];
    for (const row of SISTERS) {
      const cells: string[] = [];
      for (const column of SISTERS) {
        const tally = playMany({ decks: [lineDeck(row), lineDeck(column)], levels: ['normal', 'normal'] }, games, `matchup-${row}-${column}`);
        cells.push(percent(tally.wins[0], tally.games - tally.draws).padEnd(8));
      }
      rows.push(`${row.padEnd(9)} ${cells.join(' ')}`);
    }
    console.log(`\n${rows.join('\n')}`);
  }, 600_000);
});
