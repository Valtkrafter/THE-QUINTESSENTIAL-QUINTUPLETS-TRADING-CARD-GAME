// Runs the introductions. It starts the one that is due when the player opens a tab, looks at the game and the page every frame to see
// which step the player is at, gives what a step needs, lights up the spot, and ends the introduction when its last step is done.
// While an introduction runs, the player stays on its tab (the menu is shut and the page is brought back if it is left).

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { cardById } from '../../cards/catalog';
import { applyGift, type Gift } from '../../domain/gifts';
import type { SaveGame } from '../../domain/save';
import { battleSession, gameStore, preferencesStore, usePreferences } from '../../state/app';
import type { Preferences } from '../../state/preferences';
import { text } from '../text';
import { countedSteps, evaluate, type ContextWithoutDone, type Evaluation } from './engine';
import { useOverlayHost } from './hosts';
import { Overlay, type TargetView } from './Overlay';
import { union, type Rect } from './placement';
import { SCRIPT } from './script';
import { tutorialEnabled, tutorialStore, useActiveTutorial } from './store';
import { HOME, tabOf, tabToStart } from './tabs';
import type { Baseline, TutorialContext, TutorialStep } from './types';

/** What the screen shows for the current step. */
interface Shown {
  readonly step: TutorialStep;
  readonly target: TargetView | null;
  readonly counter: string | null;
  readonly notes: readonly string[];
}

/** What is remembered of a step, from the moment it was first looked at. */
interface StepMemory {
  readonly baseline: Baseline;
  readonly tracked: Set<string>;
  readonly seen: Set<string>;
  readonly first: Map<string, string>;
}

function present(selector: string): boolean {
  return document.querySelector(selector) !== null;
}

function readValue(selector: string): string | null {
  const element = document.querySelector(selector);
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement ? element.value : null;
}

/** The page the player is on, as the router sees it ("/packs/odds/booster"). */
function currentLocation(): string {
  const path = (window.location.hash.replace(/^#/, '').split('?')[0] ?? '').trim();
  return path === '' ? '/' : path;
}

function baselineOf(save: SaveGame, preferences: Preferences): Baseline {
  return {
    yen: save.player.yen,
    cards: save.collection.length,
    decks: save.decks.length,
    showcase: save.showcase.length,
    graded: save.collection.filter((copy) => copy.grade !== null).length,
    frameStyle: preferences.frameStyle,
  };
}

/** Where the things that match are on the screen (all of them, as one rectangle), and how round their corners are. */
function measure(selector: string): { readonly target: TargetView; readonly first: Element } | null {
  const found = Array.from(document.querySelectorAll(selector));
  const boxes = found.flatMap((element) => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 ? [{ element, rect: { x: box.x, y: box.y, w: box.width, h: box.height } satisfies Rect }] : [];
  });
  const rect = union(boxes.map((box) => box.rect));
  const first = boxes[0];
  if (rect === null || first === undefined) {
    return null;
  }
  const radius = Number.parseFloat(getComputedStyle(first.element).borderTopLeftRadius);
  return { target: { rect, radius: Number.isFinite(radius) ? Math.min(radius, 40) : 12 }, first: first.element };
}

function noteOf(gift: Gift): string {
  return gift.kind === 'yen' ? text.tutorial.gift.yen(gift.amount) : text.tutorial.gift.card(cardById(gift.cardId)?.name.en ?? gift.cardId);
}

function sameShown(a: Shown | null, b: Shown): boolean {
  if (a === null || a.step.id !== b.step.id || a.counter !== b.counter || a.notes.length !== b.notes.length) {
    return false;
  }
  if (a.target === null || b.target === null) {
    return a.target === b.target;
  }
  const near = (x: number, y: number): boolean => Math.abs(x - y) < 0.5;
  return near(a.target.rect.x, b.target.rect.x) && near(a.target.rect.y, b.target.rect.y) && near(a.target.rect.w, b.target.rect.w) && near(a.target.rect.h, b.target.rect.h) && near(a.target.radius, b.target.radius);
}

export function TutorialHost(): ReactNode {
  const [location, navigate] = useLocation();
  const preferences = usePreferences();
  const active = useActiveTutorial();
  const host = useOverlayHost();
  const [enabled] = useState(tutorialEnabled);
  const [shown, setShown] = useState<Shown | null>(null);
  // Steps whose button (or lit-up spot) the player pressed. The overlay's "Next" and the click catcher below write into it.
  const pressed = useRef(new Set<string>());
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  // Starts the introduction that is due.
  useEffect(() => {
    if (!enabled || active !== null) {
      return;
    }
    const due = tabToStart(location, preferences.tutorialDone);
    if (due !== null) {
      tutorialStore.setState({ active: due });
    }
  }, [enabled, active, location, preferences.tutorialDone]);

  // A mark on the page that says which introduction runs (tests wait for it to go away).
  useEffect(() => {
    document.documentElement.dataset['tutorialActive'] = active ?? '';
    return () => {
      delete document.documentElement.dataset['tutorialActive'];
    };
  }, [active]);

  // Keeps the player on the tab of the introduction that is running.
  useEffect(() => {
    if (active !== null && tabOf(location) !== active) {
      navigate(HOME[active], { replace: true });
    }
  }, [active, location, navigate]);

  // The introduction itself: one look at the game and the page in every frame.
  useEffect(() => {
    if (active === null) {
      return undefined;
    }
    const tab = active;
    const script = SCRIPT[tab];
    const owns = (id: string): boolean => id.startsWith(`${tab}.`);
    const memories = new Map<string, StepMemory>();
    const gifted = new Set<string>();
    const notes = new Map<string, readonly string[]>();
    const happened = new Set<string>();
    let current: TutorialStep | null = null;
    let scrolled = false;
    let lastRedirect = '';
    let shownNow: Shown | null = null;
    let frame = 0;
    pressed.current = new Set();
    const pressedNow = pressed.current;

    const unsubscribe = battleSession.subscribe((state, before) => {
      if (state.flash.tick === before.flash.tick) {
        return;
      }
      for (const event of state.flash.events) {
        if (event.type === 'attack' && event.player === 0) {
          happened.add('attacked');
        }
      }
    });

    const onClick = (event: MouseEvent): void => {
      if (current !== null && current.goal.kind === 'click' && current.target !== null && event.target instanceof Element && event.target.closest(current.target) !== null) {
        pressedNow.add(current.id);
      }
    };
    document.addEventListener('click', onClick, true);

    const stop = (): void => {
      window.cancelAnimationFrame(frame);
    };

    const tick = (): void => {
      frame = window.requestAnimationFrame(tick);
      const save = gameStore.getState().save;
      if (save === null) {
        return;
      }
      const prefs = preferencesStore.getState().preferences;
      const session = battleSession.getState();
      const where = currentLocation();
      const done = new Set(prefs.tutorialSteps.filter(owns));

      for (const memory of memories.values()) {
        for (const selector of memory.tracked) {
          if (present(selector)) {
            memory.seen.add(selector);
          }
        }
      }
      const contextFor = (stepId: string): ContextWithoutDone => {
        let memory = memories.get(stepId);
        if (memory === undefined) {
          memory = { baseline: baselineOf(save, prefs), tracked: new Set(), seen: new Set(), first: new Map() };
          memories.set(stepId, memory);
        }
        const mine = memory;
        return {
          save,
          preferences: prefs,
          location: where,
          battle: { status: session.status, battle: session.battle, waiting: session.waiting },
          start: mine.baseline,
          happened,
          has: present,
          value: readValue,
          seen: (selector) => {
            mine.tracked.add(selector);
            if (present(selector)) {
              mine.seen.add(selector);
            }
            return mine.seen.has(selector);
          },
          changed: (selector) => {
            const now = readValue(selector);
            if (now === null) {
              return false;
            }
            if (!mine.first.has(selector)) {
              mine.first.set(selector, now);
            }
            return mine.first.get(selector) !== now;
          },
        };
      };

      let result: Evaluation;
      try {
        result = evaluate(script.steps, done, pressedNow, contextFor);
      } catch (error) {
        // A step that cannot be looked at must never lock the game: the introduction stops here and comes again next time.
        console.error('The tutorial stopped:', error);
        stop();
        tutorialStore.setState({ active: null });
        return;
      }

      if (result.newlyDone.length > 0) {
        const stored = prefs.tutorialSteps;
        preferencesStore.getState().update({ tutorialSteps: [...stored, ...result.newlyDone.filter((id) => !stored.includes(id))] });
      }
      if (result.finished) {
        stop();
        const latest = preferencesStore.getState().preferences;
        preferencesStore.getState().update({
          tutorialDone: [...latest.tutorialDone.filter((entry) => entry !== tab), tab],
          tutorialSteps: latest.tutorialSteps.filter((id) => !owns(id)),
        });
        tutorialStore.setState({ active: null });
        return;
      }
      if (result.redirect !== null && result.redirect !== where && result.redirect !== lastRedirect) {
        lastRedirect = result.redirect;
        navigateRef.current(result.redirect, { replace: true });
      } else if (result.redirect === null) {
        lastRedirect = '';
      }

      const step = result.current;
      if (step === null) {
        current = null;
        if (shownNow !== null) {
          shownNow = null;
          setShown(null);
        }
        return;
      }
      const view: TutorialContext = { ...contextFor(step.id), done };
      if (current === null || current.id !== step.id) {
        current = step;
        scrolled = false;
        if (!gifted.has(step.id)) {
          gifted.add(step.id);
          const gifts = step.gifts?.(view) ?? [];
          if (gifts.length > 0) {
            gameStore.getState().change((before) => gifts.reduce((saved, gift) => applyGift(saved, gift, Date.now()), before));
            notes.set(step.id, gifts.map(noteOf));
          }
        }
      }

      const found = step.target === null ? null : measure(step.target);
      if (found !== null && !scrolled) {
        scrolled = true;
        const { y, h } = found.target.rect;
        if (y < 0 || y + h > window.innerHeight) {
          found.first.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      }
      let counter: string | null = null;
      if (script.counter) {
        const counted = countedSteps(script.steps, view);
        const index = counted.findIndex((entry) => entry.id === step.id);
        counter = index < 0 ? null : text.tutorial.ui.step(index + 1, counted.length);
      }
      const next: Shown = { step, target: found === null ? null : found.target, counter, notes: notes.get(step.id) ?? [] };
      if (!sameShown(shownNow, next)) {
        shownNow = next;
        setShown(next);
      }
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('click', onClick, true);
      unsubscribe();
      setShown(null);
    };
  }, [active]);

  if (!enabled || active === null || shown === null) {
    return null;
  }
  const step = shown.step;
  return createPortal(
    <Overlay
      step={step}
      label={text.tutorial.ui.label(text.nav[active])}
      counter={shown.counter}
      target={shown.target}
      notes={shown.notes}
      onNext={() => {
        pressed.current.add(step.id);
      }}
    />,
    host,
  );
}
