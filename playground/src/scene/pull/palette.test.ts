import { describe, expect, it } from 'vitest';
import { RARITY_IDS } from '../../cards/model';
import { burstCount, ceremonyStars, impactStrength, revealLook, starColors, threadStrength, tierOf, tierRank } from './palette';

describe('show palette', () => {
  it('gives every rarity a colour family, getting rarer from blue to rainbow', () => {
    expect(RARITY_IDS.map(tierOf)).toEqual(['blue', 'blue', 'blue', 'violet', 'rose', 'gold', 'rainbow']);
    expect(RARITY_IDS.map((rarity) => tierRank(tierOf(rarity)))).toEqual([0, 0, 0, 1, 2, 3, 4]);
  });

  it('ends the shooting star in the colour of the best card and upgrades on the way for rare packs', () => {
    for (const rarity of RARITY_IDS) {
      expect(starColors(rarity).at(-1)).toBe(tierOf(rarity));
    }
    expect(starColors('C')).toEqual(['blue']);
    expect(starColors('SAR')).toEqual(['blue', 'violet', 'gold']);
    expect(starColors('UR').length).toBeGreaterThanOrEqual(starColors('SAR').length);
  });

  it('brings the five threads for Special Art Rare and Ultra Rare only, strongest for Ultra Rare', () => {
    expect(RARITY_IDS.map(threadStrength)).toEqual([0, 0, 0, 0, 0, 0.7, 1]);
  });

  it('lights three, four or five stars in the ceremony for Art Rare, Special Art Rare and Ultra Rare, and none below', () => {
    expect(RARITY_IDS.map(ceremonyStars)).toEqual([0, 0, 0, 0, 3, 4, 5]);
  });

  it('makes the burst grow with the rarity', () => {
    let last = 0;
    let lastCount = 0;
    for (const rarity of RARITY_IDS) {
      expect(impactStrength(rarity)).toBeGreaterThan(last);
      expect(burstCount(rarity)).toBeGreaterThan(lastCount);
      last = impactStrength(rarity);
      lastCount = burstCount(rarity);
    }
    expect(impactStrength('UR')).toBe(1);
  });

  it('makes flips longer and brighter for better cards, with a spotlight for the top two', () => {
    const looks = RARITY_IDS.map(revealLook);
    for (let i = 1; i < looks.length; i += 1) {
      expect(looks[i]?.flipSeconds ?? 0).toBeGreaterThan(looks[i - 1]?.flipSeconds ?? 0);
      expect(looks[i]?.intensity ?? 0).toBeGreaterThan(looks[i - 1]?.intensity ?? 0);
    }
    expect(looks.map((look) => look.spotlight)).toEqual([false, false, false, false, false, true, true]);
  });
});
