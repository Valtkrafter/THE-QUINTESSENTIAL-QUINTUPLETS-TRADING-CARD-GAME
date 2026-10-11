// What the Card-Dex pays: a free pack for every 10 designs found, and 2,000 yen for every character whose whole set is
// found. Each reward is paid once. The screen shows what is waiting and a button takes it.

import type { CharacterId } from '../cards/model';
import { buildDex, dexProgress, dexProgressByCharacter } from './collection';
import { earnYen, type SaveGame } from './save';

export const DEX_PACK_EVERY = 10;
export const CHARACTER_BONUS_YEN = 2000;

export interface PendingDexRewards {
  readonly packs: number;
  readonly characters: readonly CharacterId[];
  readonly yen: number;
}

export function pendingDexRewards(save: SaveGame): PendingDexRewards {
  const entries = buildDex(save.collection);
  const found = dexProgress(entries).found;
  const packs = Math.max(0, Math.floor(found / DEX_PACK_EVERY) - save.dexRewards.milestones);
  const done = save.dexRewards.characters;
  const characters = [...dexProgressByCharacter(entries)].filter(([id, progress]) => progress.found === progress.total && !done.includes(id)).map(([id]) => id);
  return { packs, characters, yen: characters.length * CHARACTER_BONUS_YEN };
}

export interface DexClaim {
  readonly save: SaveGame;
  readonly claimed: PendingDexRewards;
}

/** Takes everything that is waiting: the free packs are put aside to be opened, the yen are paid. */
export function claimDexRewards(save: SaveGame, now: number): DexClaim {
  const claimed = pendingDexRewards(save);
  if (claimed.packs === 0 && claimed.characters.length === 0) {
    return { save, claimed };
  }
  const rewards = {
    milestones: save.dexRewards.milestones + claimed.packs,
    characters: [...save.dexRewards.characters, ...claimed.characters],
    freePacks: save.dexRewards.freePacks + claimed.packs,
  };
  return { save: earnYen({ ...save, dexRewards: rewards }, claimed.yen, now), claimed };
}
