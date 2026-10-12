import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { newSaveGame } from '../../domain/save';
import { DEFAULT_PREFERENCES, TUTORIAL_TABS } from '../../state/preferences';
import { text } from '../text';
import { evaluate, type ContextWithoutDone } from './engine';
import { SCRIPT } from './script';
import { HOME, tabOf } from './tabs';

const UI = join(import.meta.dirname, '..');

function filesUnder(folder: string, extension: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? filesUnder(path, extension) : path.endsWith(extension) ? [path] : [];
  });
}

const allSteps = TUTORIAL_TABS.flatMap((tab) => SCRIPT[tab].steps.map((step) => ({ tab, step })));

describe('the introductions', () => {
  it('have a list of steps for every tab, starting at a page of that tab', () => {
    for (const tab of TUTORIAL_TABS) {
      expect(SCRIPT[tab].steps.length).toBeGreaterThan(2);
      expect(SCRIPT[tab].home).toBe(HOME[tab]);
      expect(tabOf(SCRIPT[tab].home)).toBe(tab);
    }
  });

  it('give every step an id of its own that starts with its tab', () => {
    const ids = allSteps.map(({ step }) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { tab, step } of allSteps) {
      expect(step.id.startsWith(`${tab}.`)).toBe(true);
    }
  });

  it('end every tab with exactly one last step, and nothing after it', () => {
    for (const tab of TUTORIAL_TABS) {
      const steps = SCRIPT[tab].steps;
      expect(steps.filter((step) => step.last === true)).toHaveLength(1);
      expect(steps[steps.length - 1]?.last).toBe(true);
    }
  });

  it('say what a step is about in a few plain words', () => {
    for (const { step } of allSteps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.title.length).toBeLessThanOrEqual(32);
      expect(step.text.length).toBeGreaterThan(8);
      expect(step.text.length).toBeLessThanOrEqual(230);
      expect(step.text).not.toMatch(/ {2}/);
      expect(step.text).toMatch(/[.!?”…]$/);
    }
  });

  it('point only at spots that the screens really carry', () => {
    // Every `spot('name')` and `data-tutorial="name"` of the steps must be written somewhere in the screens as well.
    const screens = filesUnder(UI, '.tsx')
      .filter((file) => !file.includes(`${join('ui', 'tutorial')}`))
      .map((file) => readFileSync(file, 'utf-8'))
      .join('\n');
    const prefixes = [...screens.matchAll(/`([a-z][a-z-]*)\$\{/g)].map((match) => match[1] ?? '');
    const wanted = new Set<string>();
    for (const file of filesUnder(join(UI, 'tutorial', 'steps'), '.ts').filter((path) => !path.endsWith('helpers.ts'))) {
      const source = readFileSync(file, 'utf-8');
      for (const match of source.matchAll(/spot\('([a-z][a-z-]*)'\)/g)) {
        wanted.add(match[1] ?? '');
      }
      for (const match of source.matchAll(/data-tutorial="([a-z][a-z-]*)"/g)) {
        wanted.add(match[1] ?? '');
      }
    }
    expect(wanted.size).toBeGreaterThan(40);
    const missing = [...wanted].filter((name) => !(screens.includes(`'${name}'`) || screens.includes(`"${name}"`) || prefixes.some((prefix) => name.startsWith(prefix))));
    expect(missing).toEqual([]);
  });

  it('keep every spot of a step a plain `data-tutorial` selector', () => {
    for (const { step } of allSteps) {
      if (step.target !== null) {
        expect(step.target).toMatch(/^\[data-tutorial="[a-z][a-z-]*(-\$\{[a-z]+\})?"\]/);
      }
    }
  });

  it('can be looked at on an empty page without a crash, and start with a step that can be shown', () => {
    for (const tab of TUTORIAL_TABS) {
      const save = newSaveGame('script', 1_800_000_000_000);
      const context: ContextWithoutDone = {
        save,
        preferences: DEFAULT_PREFERENCES,
        location: HOME[tab],
        battle: { status: 'idle', battle: null, waiting: false },
        start: { yen: save.player.yen, cards: 0, decks: 0, showcase: 0, graded: 0, frameStyle: 'classic' },
        happened: new Set(),
        has: () => false,
        value: () => null,
        seen: () => false,
        changed: () => false,
      };
      const result = evaluate(SCRIPT[tab].steps, new Set(), new Set(), () => context);
      expect(result.current).not.toBeNull();
      expect(result.finished).toBe(false);
    }
  });
});

describe('the words of the introductions', () => {
  it('are in the text file of the game', () => {
    expect(text.tutorial.packs.welcome.title).toBe('Welcome to TQQ!');
    expect(text.tutorial.ui.next).toBe('Next');
  });
});
