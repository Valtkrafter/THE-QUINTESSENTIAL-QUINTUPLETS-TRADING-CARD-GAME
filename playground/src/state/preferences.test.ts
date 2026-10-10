import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, createMemoryPreferenceStorage, createPreferencesStore, parsePreferences } from './preferences';

describe('preferences', () => {
  it('falls back to the defaults for missing, broken or foreign values', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('not json')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"version":1,"frameStyle":"neon","graphics":"high","idleMotion":true}')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"version":1,"frameStyle":"paper","graphics":"low","idleMotion":false,"extra":1}')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"version":1,"frameStyle":"paper","graphics":"low","idleMotion":false,"volume":3}')).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps the old settings of a player and fills in what is new', () => {
    const old = JSON.stringify({ version: 1, frameStyle: 'fade', graphics: 'normal', idleMotion: false });
    expect(parsePreferences(old)).toEqual({ ...DEFAULT_PREFERENCES, frameStyle: 'fade', graphics: 'normal', idleMotion: false });
  });

  it('reads a valid value', () => {
    const text = JSON.stringify({ version: 1, frameStyle: 'fade', graphics: 'low', idleMotion: false, pullAnimation: 'short', volume: 0.3, muted: true });
    expect(parsePreferences(text)).toEqual({ version: 1, frameStyle: 'fade', graphics: 'low', idleMotion: false, pullAnimation: 'short', volume: 0.3, muted: true });
  });

  it('loads, changes and stores', async () => {
    const storage = createMemoryPreferenceStorage(JSON.stringify({ ...DEFAULT_PREFERENCES, graphics: 'normal' }));
    const store = createPreferencesStore(storage);
    expect(store.getState().loaded).toBe(false);
    await store.getState().start();
    expect(store.getState().preferences.graphics).toBe('normal');
    store.getState().update({ frameStyle: 'glass' });
    expect(store.getState().preferences).toEqual({ ...DEFAULT_PREFERENCES, graphics: 'normal', frameStyle: 'glass' });
    await Promise.resolve();
    expect(parsePreferences(storage.text).frameStyle).toBe('glass');
  });

  it('starts with the defaults when storage fails', async () => {
    const store = createPreferencesStore({ read: () => Promise.reject(new Error('blocked')), write: () => Promise.reject(new Error('blocked')) });
    await store.getState().start();
    expect(store.getState().loaded).toBe(true);
    expect(store.getState().preferences).toEqual(DEFAULT_PREFERENCES);
    expect(() => store.getState().update({ idleMotion: false })).not.toThrow();
  });
});
