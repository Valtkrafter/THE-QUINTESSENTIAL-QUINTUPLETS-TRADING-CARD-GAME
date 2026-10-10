import { describe, expect, it } from 'vitest';
import { simulateBanner, simulateCollecting, simulatePacks } from './simulate';

const TODAY = '2026-10-12';

describe('the pack simulator', () => {
  it('finds the published odds back in the average pack', () => {
    const report = simulatePacks('booster', 40_000, 'odds', TODAY);
    // Three basic slots (60/40), the plus slot and the hit slot, with the guarantees running.
    expect(report.perPack.C).toBeCloseTo(1.8, 1);
    expect(report.perPack.U).toBeGreaterThan(1.45);
    expect(report.perPack.U).toBeLessThan(1.65);
    expect(report.chance.ur).toBeGreaterThan(0.038);
    expect(report.chance.ur).toBeLessThan(0.05);
    expect(report.chance.sarOrUr).toBeGreaterThan(0.13);
    expect(report.chance.sarOrUr).toBeLessThan(0.17);
    expect(report.chance.rrOrBetter).toBeGreaterThan(0.6);
    expect(report.chance.rrOrBetter).toBeLessThan(0.7);
  });

  it('fires the guarantees only rarely', () => {
    const report = simulatePacks('booster', 40_000, 'fire', TODAY);
    expect(report.guarantee.sar).toBeGreaterThan(0);
    expect(report.guarantee.sar).toBeLessThan(0.02);
    expect(report.guarantee.ur).toBeLessThan(0.02);
  });

  it('hands out about one special finish per pack and a premium one every few packs', () => {
    const report = simulatePacks('booster', 20_000, 'finish', TODAY);
    expect(report.chance.specialFinish).toBeGreaterThan(0.5);
    expect(report.chance.specialFinish).toBeLessThan(0.8);
    expect(report.chance.premiumFinish).toBeGreaterThan(0.08);
    expect(report.chance.premiumFinish).toBeLessThan(0.3);
  });

  it('makes collecting a long job, with the guarantees as the ceiling', () => {
    const report = simulateCollecting('booster', 120, 'collect', TODAY);
    // First big hits come soon, but the whole set takes hundreds of packs.
    expect(report.firstSar.median).toBeLessThan(20);
    expect(report.firstUr.median).toBeGreaterThan(8);
    expect(report.firstUr.median).toBeLessThan(40);
    expect(report.core.median).toBeGreaterThan(40);
    expect(report.all.median).toBeGreaterThan(180);
    expect(report.all.median).toBeLessThan(340);
    // Never stuck: 5 Ultra Rares at 90 packs each is the worst case, and even bad luck stays below it.
    expect(report.all.p90).toBeLessThan(5 * 90 + 120);
  });

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
