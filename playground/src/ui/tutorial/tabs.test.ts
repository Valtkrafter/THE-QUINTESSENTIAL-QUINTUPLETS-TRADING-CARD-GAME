import { describe, expect, it } from 'vitest';
import { TUTORIAL_TABS } from '../../state/preferences';
import { HOME, isLocked, tabOf, tabToStart } from './tabs';

describe('the tab of a page', () => {
  it('knows every page of the menu, and the pages below them', () => {
    expect(tabOf('/')).toBe('binder');
    expect(tabOf('/card/c0007')).toBe('binder');
    expect(tabOf('/packs')).toBe('packs');
    expect(tabOf('/packs/odds/booster')).toBe('packs');
    expect(tabOf('/decks/new')).toBe('decks');
    expect(tabOf('/decks/template/ichika')).toBe('decks');
    expect(tabOf('/settings')).toBe('settings');
    expect(tabOf('/somewhere')).toBeNull();
  });

  it('starts every tab at a page that belongs to it', () => {
    for (const tab of TUTORIAL_TABS) {
      expect(tabOf(HOME[tab])).toBe(tab);
    }
  });
});

describe('which introduction is due', () => {
  it('is the Packs one for everybody until it is done, wherever they are', () => {
    expect(tabToStart('/', [])).toBe('packs');
    expect(tabToStart('/battle', ['shop'])).toBe('packs');
    expect(tabToStart('/packs', [])).toBe('packs');
  });

  it('is the one of the tab the player is on once Packs is done', () => {
    expect(tabToStart('/shop', ['packs'])).toBe('shop');
    expect(tabToStart('/', ['packs'])).toBe('binder');
    expect(tabToStart('/card/c0007', ['packs'])).toBe('binder');
  });

  it('is none for a tab that was done, or for a page that is no tab', () => {
    expect(tabToStart('/shop', ['packs', 'shop'])).toBeNull();
    expect(tabToStart('/somewhere', ['packs'])).toBeNull();
    expect(tabToStart('/packs', ['packs'])).toBeNull();
  });
});

describe('the lock of the menu', () => {
  it('shuts every entry but the one of the running introduction', () => {
    expect(isLocked(null, 'shop')).toBe(false);
    expect(isLocked('packs', 'packs')).toBe(false);
    expect(isLocked('packs', 'shop')).toBe(true);
  });
});
