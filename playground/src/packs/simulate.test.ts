import { describe, expect, it } from 'vitest';
import { simulateBanner, simulateCollecting, simulatePacks } from './simulate';

const TODAY = '2026-10-12';

describe('the pack simulator', () => {
  it('finds the published odds back in the average Booster', () => {
    const report = simulatePacks('booster', 40_000, 'odds', TODAY);
    // Three basic slots (68/32), the plus slot and the hit slot, with the guarantees running.
    expect(report.perPack.C).toBeCloseTo(2.04, 1);
    expect(report.perPack.U).toBeGreaterThan(1.5);
    expect(report.perPack.U).toBeLessThan(1.7);
    // Ultra Rare: 0.5 % in the dice, a little more with the guarantee (about one pack in 105).
    expect(report.chance.ur).toBeGreaterThan(0.007);
    expect(report.chance.ur).toBeLessThan(0.013);
    expect(report.chance.sarOrUr).toBeGreaterThan(0.025);
    expect(report.chance.sarOrUr).toBeLessThan(0.04);
    expect(report.chance.rrOrBetter).toBeGreaterThan(0.24);
    expect(report.chance.rrOrBetter).toBeLessThan(0.32);
  });

  it('makes the good cards much rarer than the first versions did: under one pack in ten has an Art Rare or better', () => {
    const report = simulatePacks('booster', 30_000, 'rarer', TODAY);
    const artOrBetter = report.perPack.AR + report.perPack.SAR + report.perPack.UR;
    expect(artOrBetter).toBeLessThan(0.12);
  });

  it('fires the guarantees only now and then', () => {
    const report = simulatePacks('booster', 40_000, 'fire', TODAY);
    expect(report.guarantee.sar).toBeGreaterThan(0);
    expect(report.guarantee.sar).toBeLessThan(0.02);
    expect(report.guarantee.ur).toBeLessThan(0.01);
  });

  it('hands out a special finish in about every other Booster, and more in the dearer packs', () => {
    const booster = simulatePacks('booster', 20_000, 'finish', TODAY);
    expect(booster.chance.specialFinish).toBeGreaterThan(0.4);
    expect(booster.chance.specialFinish).toBeLessThan(0.65);
    expect(booster.chance.premiumFinish).toBeGreaterThan(0.03);
    expect(booster.chance.premiumFinish).toBeLessThan(0.12);
    const premium = simulatePacks('premium', 10_000, 'finish', TODAY);
    expect(premium.chance.premiumFinish).toBeGreaterThan(booster.chance.premiumFinish * 4);
    expect(premium.chance.specialFinish).toBeGreaterThan(0.95);
  });

  it('makes collecting a long job with the Booster, and about as long with any other pack', () => {
    const booster = simulateCollecting('booster', 100, 'collect', TODAY);
    // First big hits come in weeks, not days; the whole set takes hundreds of packs.
    expect(booster.firstSar.median).toBeGreaterThan(25);
    expect(booster.firstSar.median).toBeLessThan(90);
    expect(booster.firstUr.median).toBeGreaterThan(60);
    expect(booster.firstUr.median).toBeLessThan(150);
    expect(booster.core.median).toBeGreaterThan(40);
    expect(booster.all.median).toBeGreaterThan(450);
    expect(booster.all.median).toBeLessThan(850);
    // Never stuck: the Ultra Rare guarantee and the duplicate protection of the guaranteed cards keep bad luck bounded.
    expect(booster.all.p90).toBeLessThan(1200);
    const premium = simulateCollecting('premium', 100, 'collect', TODAY);
    const select = simulateCollecting('select', 100, 'collect', TODAY);
    // In yen the three routes are close: the dearer packs are for people who would rather save up than open many.
    const yen = (report: typeof booster, price: number) => report.all.median * price;
    expect(yen(premium, 3000) / yen(booster, 300)).toBeGreaterThan(0.6);
    expect(yen(premium, 3000) / yen(booster, 300)).toBeLessThan(1.4);
    expect(yen(select, 1000) / yen(booster, 300)).toBeGreaterThan(0.6);
    expect(yen(select, 1000) / yen(booster, 300)).toBeLessThan(1.4);
  }, 120_000);

  it('gives the banner about one card in 35 packs with a 50/50 on the main cards', () => {
    const report = simulateBanner('halloween', 1500, 75, 'banner', TODAY);
    expect(report.packsPerHit).toBeGreaterThan(28);
    expect(report.packsPerHit).toBeLessThan(42);
    expect(report.atLeastOne).toBeGreaterThan(0.9);
    expect(report.atLeastOneMain).toBeGreaterThan(0.7);
    expect(report.atLeastOneMain).toBeLessThan(0.9);
    expect(report.averageHits).toBeGreaterThan(1.6);
    expect(report.averageHits).toBeLessThan(2.3);
  });

  it('refuses a pack without a banner for the banner report', () => {
    expect(() => simulateBanner('booster', 10, 10, 'x', TODAY)).toThrow(/no banner/);
    expect(() => simulatePacks('nothing', 10, 'x', TODAY)).toThrow(/no pack called/);
  });
});
