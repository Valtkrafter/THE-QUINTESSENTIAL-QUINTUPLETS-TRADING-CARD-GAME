// Settings of this device (not part of the save game, so an exported save does not change how another device looks).
// A missing or broken value falls back to the defaults: preferences must never stop the game from starting.

import { del, get, set } from 'idb-keyval';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { z } from 'zod';
import { FRAME_STYLE_IDS } from '../cards/frameStyle';

export const GRAPHICS_LEVELS = ['high', 'normal', 'low'] as const;
export type GraphicsLevel = (typeof GRAPHICS_LEVELS)[number];

export const PULL_ANIMATIONS = ['full', 'short', 'off'] as const;
export type PullAnimation = (typeof PULL_ANIMATIONS)[number];

export const preferencesSchema = z.strictObject({
  version: z.literal(1),
  /** Frame design of every card face. */
  frameStyle: z.enum(FRAME_STYLE_IDS),
  /** `high` draws the 3D card at full sharpness, `low` saves battery and weak graphics cards. */
  graphics: z.enum(GRAPHICS_LEVELS),
  /** The slow sway of a card that nobody touches. */
  idleMotion: z.boolean(),
  /** How much show a pack opening gets: all of it, a short version, or none. */
  pullAnimation: z.enum(PULL_ANIMATIONS).default('full'),
  /** Sound volume from 0 to 1. */
  volume: z.number().min(0).max(1).default(0.8),
  muted: z.boolean().default(false),
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  version: 1,
  frameStyle: 'classic',
  graphics: 'high',
  idleMotion: true,
  pullAnimation: 'full',
  volume: 0.8,
  muted: false,
};

/** Largest pixel ratio the 3D card is drawn at, per graphics level. */
export const MAX_PIXEL_RATIO: Readonly<Record<GraphicsLevel, number>> = { high: 2, normal: 1.5, low: 1 };

export function parsePreferences(text: string | null): Preferences {
  if (text === null) {
    return DEFAULT_PREFERENCES;
  }
  try {
    const parsed = preferencesSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export interface PreferenceStorage {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
}

const KEY = 'tqq-preferences-v1';

export function createIdbPreferenceStorage(key: string = KEY): PreferenceStorage {
  return {
    read: async () => (await get<string>(key)) ?? null,
    write: (text) => set(key, text),
  };
}

export function createMemoryPreferenceStorage(initial: string | null = null): PreferenceStorage & { text: string | null } {
  const storage = {
    text: initial,
    read: () => Promise.resolve(storage.text),
    write: (text: string) => {
      storage.text = text;
      return Promise.resolve();
    },
  };
  return storage;
}

export async function clearPreferences(key: string = KEY): Promise<void> {
  await del(key);
}

export interface PreferencesState {
  readonly loaded: boolean;
  readonly preferences: Preferences;
  start(): Promise<void>;
  update(change: Partial<Omit<Preferences, 'version'>>): void;
}

export type PreferencesStore = StoreApi<PreferencesState>;

export function createPreferencesStore(storage: PreferenceStorage): PreferencesStore {
  let starting: Promise<void> | null = null;
  return createStore<PreferencesState>()((setState, getState) => ({
    loaded: false,
    preferences: DEFAULT_PREFERENCES,
    start() {
      starting ??= storage
        .read()
        .catch(() => null)
        .then((text) => setState({ loaded: true, preferences: parsePreferences(text) }));
      return starting;
    },
    update(change) {
      const preferences: Preferences = { ...getState().preferences, ...change };
      setState({ preferences });
      void storage.write(JSON.stringify(preferences)).catch(() => undefined);
    },
  }));
}
