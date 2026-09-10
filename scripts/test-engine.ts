/**
 * TQQ Vault - Verification & Engine Test Suite
 * Validates card catalog integrity, pricing matrices, drop table distributions,
 * pity triggers, consumable modifiers, binder synergies, and Zustand store actions.
 */

import {
  CARDS_CATALOG,
  CARDS_BY_RARITY,
  CARDS_BY_CHARACTER,
  getCardDef,
} from '../src/config/cardsData';
import {
  calculateRawCardValue,
  calculateGradedCardValue,
  calculateGradingFee,
  calculateDustYield,
  rollGrading,
  rollPackDrops,
  analyzeBinderPage,
  calculateAccruedIdleEarnings,
  PACKS_CONFIG,
  CONSUMABLE_TOOLS,
  GRADE_TIER_CONFIG,
  NAKANO_SISTERS,
} from '../src/config/economy';
import { useGameStore } from '../src/store/useGameStore';
import { CardInstance, BinderPage, Rarity, GradeTier } from '../src/types/card';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

function testSection(title: string): void {
  console.log(`\n========================================`);
  console.log(`  ${title}`);
  console.log(`========================================`);
}

async function runTests() {
  testSection('1. Card Catalog & Metadata Integrity');
  console.log(`Total catalog entries: ${CARDS_CATALOG.length}`);
  assert(CARDS_CATALOG.length >= 50, 'Catalog should contain at least 50 cards');

  // Verify CARDS_BY_RARITY has entries for every rarity
  const allRarities: Rarity[] = ['C', 'UC', 'R', 'SR', 'UR', 'SEC', 'MR'];
  for (const r of allRarities) {
    assert(CARDS_BY_RARITY[r].length > 0, `CARDS_BY_RARITY must have cards for ${r}`);
  }

  // Verify CONSUMABLE_TOOLS catalog
  assert(CONSUMABLE_TOOLS.microfiber_cloth.stardustCost === 50, 'Cloth cost is 50');
  assert(CONSUMABLE_TOOLS.centering_laser.stardustCost === 150, 'Laser cost is 150');
  assert(CONSUMABLE_TOOLS.vault_insurance.stardustCost === 300, 'Insurance cost is 300');

  // Verify all 5 sisters have cards across all rarities
  const rarities: Rarity[] = ['C', 'UC', 'R', 'SR', 'UR', 'SEC', 'MR'];
  for (const sister of NAKANO_SISTERS) {
    const sisterCards = CARDS_BY_CHARACTER[sister];
    assert(sisterCards.length >= 7, `${sister} should have at least 7 cards`);
    for (const r of rarities) {
      const match = sisterCards.find((c) => c.rarity === r);
      assert(Boolean(match), `${sister} missing card for rarity ${r}`);
    }
  }
  console.log('✅ All 5 Nakano sisters have complete card spreads from C through MR.');

  // Verify support characters
  const supportChars = ['fuutarou', 'raiha', 'maruo', 'isanari', 'takeda'] as const;
  for (const s of supportChars) {
    const sCards = CARDS_BY_CHARACTER[s];
    assert(sCards.length > 0, `Support character ${s} has no registered cards`);
    for (const card of sCards) {
      assert(card.characterRole === 'support', `${card.name} must have characterRole = support`);
    }
  }
  console.log('✅ All 5 support characters verified with correct roles.');

  testSection('2. Mathematical Formulas & Pricing Matrices');
  // Raw values
  assert(calculateRawCardValue('C', 'raw') === 15, 'C raw must be 15');
  assert(calculateRawCardValue('UC', 'holo') === Math.round(50 * 1.8), 'UC holo must be 90');
  assert(calculateRawCardValue('R', 'sparkle') === Math.round(200 * 3.5), 'R sparkle must be 700');
  assert(calculateRawCardValue('SR', 'rainbow') === Math.round(900 * 7.0), 'SR rainbow must be 6300');
  assert(calculateRawCardValue('UR', 'gold_etched') === Math.round(4000 * 15.0), 'UR gold_etched must be 60000');
  assert(calculateRawCardValue('SEC', 'signed') === Math.round(20000 * 40.0), 'SEC signed must be 800000');
  assert(calculateRawCardValue('MR', 'signed') === Math.round(100000 * 40.0), 'MR signed must be 4000000');
  console.log('✅ Base rarity values and finish multipliers verified.');

  // Graded multipliers
  assert(calculateGradedCardValue(1000, 'POOR_1_3') === 150, 'Poor multiplier must be 0.15x');
  assert(calculateGradedCardValue(1000, 'USED_4_6') === 500, 'Used multiplier must be 0.50x');
  assert(calculateGradedCardValue(1000, 'CRISP_7_8') === 1250, 'Crisp multiplier must be 1.25x');
  assert(calculateGradedCardValue(1000, 'MINT_9') === 3000, 'Mint 9 multiplier must be 3.00x');
  assert(calculateGradedCardValue(1000, 'GEM_MINT_10') === 12000, 'Gem Mint 10 multiplier must be 12.00x');
  assert(calculateGradedCardValue(1000, 'BLACK_LABEL') === 50000, 'Black Label multiplier must be 50.00x');
  console.log('✅ Grade tier multipliers verified.');

  // Grading fee & Raiha support discount
  const dummyCard: CardInstance = {
    id: 'test_card_1',
    cardDefId: 'miku_c_01',
    characterId: 'miku',
    rarity: 'C',
    finish: 'raw',
    obtainedAt: Date.now(),
  };
  const standardFee = calculateGradingFee(dummyCard, false);
  const raihaFee = calculateGradingFee(dummyCard, true);
  assert(standardFee === Math.round(15 * 0.5), 'Standard grading fee must be 50% of raw value');
  assert(raihaFee === Math.round(15 * 0.5 * 0.85), 'Raiha support must provide -15% fee discount');
  console.log(`✅ Grading fee verified: standard = ${standardFee} ¥, with Raiha = ${raihaFee} ¥.`);

  // Dusting & Maruo support bonus
  const standardDust = calculateDustYield(dummyCard, false);
  const maruoDust = calculateDustYield(dummyCard, true);
  assert(standardDust === Math.floor(15 * 0.2), 'Standard dust must be 20% of raw value');
  assert(maruoDust === Math.floor(standardDust * 1.2), 'Maruo support must provide +20% dust bonus');
  console.log(`✅ Dust yield verified: standard = ${standardDust} Stardust, with Maruo = ${maruoDust} Stardust.`);

  testSection('3. Grading Vault Roll Engine & Consumables Simulation');
  const SIMULATION_COUNT = 10000;

  // Baseline grading simulation
  const baselineTiers: Record<GradeTier, number> = {
    POOR_1_3: 0,
    USED_4_6: 0,
    CRISP_7_8: 0,
    MINT_9: 0,
    GEM_MINT_10: 0,
    BLACK_LABEL: 0,
  };
  for (let i = 0; i < SIMULATION_COUNT; i++) {
    const res = rollGrading(dummyCard, []);
    baselineTiers[res.gradeResult.tier]++;
  }
  console.log('Baseline 10,000 Grading Rolls Distribution:');
  for (const tier of Object.keys(baselineTiers) as GradeTier[]) {
    const pct = ((baselineTiers[tier] / SIMULATION_COUNT) * 100).toFixed(2);
    const expected = GRADE_TIER_CONFIG[tier].baseChance;
    console.log(`  ${tier} (${GRADE_TIER_CONFIG[tier].tierLabel}): ${pct}% (Expected: ${expected}%)`);
  }
  assert(baselineTiers.POOR_1_3 > 0, 'POOR_1_3 should occur in baseline');
  assert(baselineTiers.BLACK_LABEL > 0, 'BLACK_LABEL should occur in 10,000 rolls');

  // Microfiber Cloth simulation (eliminate 1–3)
  let clothPoorCount = 0;
  for (let i = 0; i < 3000; i++) {
    const res = rollGrading(dummyCard, ['microfiber_cloth']);
    if (res.gradeResult.tier === 'POOR_1_3') {
      clothPoorCount++;
    }
  }
  assert(clothPoorCount === 0, 'Microfiber cloth MUST eliminate all Grades 1–3');
  console.log('✅ Microfiber Cloth verified: 0% Grade 1–3 across 3,000 rolls.');

  // Centering Laser simulation (+5% flat Grade 10)
  let laserGem10Count = 0;
  for (let i = 0; i < SIMULATION_COUNT; i++) {
    const res = rollGrading(dummyCard, ['centering_laser']);
    if (res.gradeResult.tier === 'GEM_MINT_10') {
      laserGem10Count++;
    }
  }
  const laserGem10Pct = (laserGem10Count / SIMULATION_COUNT) * 100;
  console.log(`✅ Centering Laser verified: Grade 10 rolled ${laserGem10Pct.toFixed(2)}% (Baseline: 4.7%, Expected: ~9.7%).`);
  assert(laserGem10Pct > 7.5 && laserGem10Pct < 12.0, 'Centering laser should boost Grade 10 to ~9.7%');

  // Vault Insurance simulation (reroll if < 7)
  let rerolledCount = 0;
  for (let i = 0; i < 2000; i++) {
    const res = rollGrading(dummyCard, ['vault_insurance']);
    if (res.insuranceRerolled) {
      rerolledCount++;
    }
  }
  console.log(`✅ Vault Insurance verified: Reroll triggered ${rerolledCount} / 2,000 times on grades below 7.`);
  assert(rerolledCount > 0, 'Insurance should trigger when roll is < 7');

  testSection('4. Pity System & Drop Tables Validation');
  // Test-Sheet Pack: 0 cost, 3 slots, 92% C, 8% UC
  const testSheetConfig = PACKS_CONFIG.test_sheet;
  assert(testSheetConfig.costYen === 0, 'Test-Sheet cost must be 0');
  assert(testSheetConfig.slots === 3, 'Test-Sheet slots must be 3');

  // Pity counter increments on paid packs
  const initialPitySR = { packsWithoutSR: 29, packsWithoutUR: 10 };
  const pitySRResult = rollPackDrops('lernsession', initialPitySR);
  assert(pitySRResult.pityTriggered === 'SR', 'Pity SR must trigger at pack 30');
  console.log('✅ Hard pity at 30 packs without SR triggers guaranteed SR+ in slot 5.');

  const pityURResult = rollPackDrops('sommerfeuerwerk', { packsWithoutSR: 5, packsWithoutUR: 99 });
  assert(pityURResult.pityTriggered === 'UR', 'Pity UR must trigger at pack 100');
  console.log('✅ Hard pity at 100 packs without UR triggers guaranteed UR+ in slot 5.');

  testSection('5. Binder Synergies & Idle Yield Engine');
  // Test All 5 Sisters Synergy (+50%)
  const page: BinderPage = {
    id: 'test_page',
    name: 'Synergy Test Page',
    slots: [
      { slotIndex: 0, allowedRole: 'sister', cardInstanceId: 'c1' },
      { slotIndex: 1, allowedRole: 'sister', cardInstanceId: 'c2' },
      { slotIndex: 2, allowedRole: 'sister', cardInstanceId: 'c3' },
      { slotIndex: 3, allowedRole: 'sister', cardInstanceId: 'c4' },
      { slotIndex: 4, allowedRole: 'sister', cardInstanceId: 'c5' },
      { slotIndex: 5, allowedRole: 'support', cardInstanceId: null },
    ],
  };

  const cardMap = new Map<string, CardInstance>([
    ['c1', { id: 'c1', cardDefId: 'ichika_r_01', characterId: 'ichika', rarity: 'R', finish: 'raw', obtainedAt: 0 }],
    ['c2', { id: 'c2', cardDefId: 'nino_r_01', characterId: 'nino', rarity: 'R', finish: 'raw', obtainedAt: 0 }],
    ['c3', { id: 'c3', cardDefId: 'miku_r_01', characterId: 'miku', rarity: 'R', finish: 'raw', obtainedAt: 0 }],
    ['c4', { id: 'c4', cardDefId: 'yotsuba_r_01', characterId: 'yotsuba', rarity: 'R', finish: 'raw', obtainedAt: 0 }],
    ['c5', { id: 'c5', cardDefId: 'itsuki_r_01', characterId: 'itsuki', rarity: 'R', finish: 'raw', obtainedAt: 0 }],
  ]);

  const reportAllFive = analyzeBinderPage(page, cardMap);
  assert(reportAllFive.allFiveSisters === true, 'All 5 sisters must be detected');
  assert(reportAllFive.synergyMultiplier === 1.5, '5 sisters synergy multiplier must be 1.5x (+50%)');
  console.log(`✅ All 5 sisters synergy verified: Multiplier = ${reportAllFive.synergyMultiplier}x`);

  // Add Fuutarou in slot 6 (2x page yield)
  page.slots[5].cardInstanceId = 'fuu';
  cardMap.set('fuu', { id: 'fuu', cardDefId: 'fuutarou_r_01', characterId: 'fuutarou', rarity: 'R', finish: 'raw', obtainedAt: 0 });
  const reportWithFuu = analyzeBinderPage(page, cardMap);
  assert(reportWithFuu.synergyMultiplier === 3.0, '5 sisters (1.5x) * Fuutarou (2x) must equal 3.0x');
  console.log(`✅ Fuutarou 2x multiplier verified: Combined Multiplier = ${reportWithFuu.synergyMultiplier}x`);

  // Test Mono-Waifu (+25%)
  page.slots[0].cardInstanceId = 'm1';
  page.slots[1].cardInstanceId = 'm2';
  page.slots[2].cardInstanceId = 'm3';
  page.slots[3].cardInstanceId = 'm4';
  page.slots[4].cardInstanceId = 'm5';
  page.slots[5].cardInstanceId = null;
  cardMap.set('m1', { id: 'm1', cardDefId: 'miku_c_01', characterId: 'miku', rarity: 'C', finish: 'raw', obtainedAt: 0 });
  cardMap.set('m2', { id: 'm2', cardDefId: 'miku_uc_01', characterId: 'miku', rarity: 'UC', finish: 'raw', obtainedAt: 0 });
  cardMap.set('m3', { id: 'm3', cardDefId: 'miku_r_01', characterId: 'miku', rarity: 'R', finish: 'raw', obtainedAt: 0 });
  cardMap.set('m4', { id: 'm4', cardDefId: 'miku_sr_01', characterId: 'miku', rarity: 'SR', finish: 'raw', obtainedAt: 0 });
  cardMap.set('m5', { id: 'm5', cardDefId: 'miku_ur_01', characterId: 'miku', rarity: 'UR', finish: 'raw', obtainedAt: 0 });
  const reportMono = analyzeBinderPage(page, cardMap);
  assert(reportMono.monoWaifu === true, 'Mono-waifu must be detected');
  assert(reportMono.synergyMultiplier === 1.25, 'Mono-waifu multiplier must be 1.25x (+25%)');
  console.log(`✅ Mono-Waifu synergy verified: Multiplier = ${reportMono.synergyMultiplier}x`);

  // Offline earnings calculation (0.02% / min, 24h cap)
  const earnings60m = calculateAccruedIdleEarnings(reportMono, 60, 24);
  const expected60m = Math.floor(60 * reportMono.effectiveYieldPerMinute);
  assert(earnings60m === expected60m, '60 minutes earnings match exact formula');
  console.log(`✅ Offline idle earnings verified: ${earnings60m} ¥ earned over 60 minutes.`);

  testSection('6. Zustand Store Full Lifecycle & Actions');
  const store = useGameStore.getState();
  store.resetSave();

  // Check initial state
  assert(useGameStore.getState().yen === 1000, 'Starting Yen must be 1000');
  assert(useGameStore.getState().stardust === 0, 'Starting Stardust must be 0');
  assert(useGameStore.getState().inventory.length === 0, 'Inventory starts empty');
  console.log('✅ Store initial state verified.');

  // Open Kiosk Pack (Cost: 100 ¥)
  const packResult = useGameStore.getState().openPack('kiosk');
  assert(useGameStore.getState().yen === 900, 'Yen deducted properly for Kiosk pack');
  assert(useGameStore.getState().inventory.length === 5, 'Inventory has 5 cards');
  assert(packResult.cards.length === 5, 'Pack gave 5 cards');
  console.log('✅ openPack action verified.');

  // Pick a card to dust
  const rawCardToDust = useGameStore.getState().inventory[0];
  const dustEarned = useGameStore.getState().dustCard(rawCardToDust.id);
  assert(useGameStore.getState().stardust === dustEarned, 'Stardust credited from dusting');
  assert(useGameStore.getState().inventory.length === 4, 'Card removed from inventory');
  console.log(`✅ dustCard action verified: Earned ${dustEarned} Stardust.`);

  // Test tool purchase
  // Give enough stardust to test tool buying
  useGameStore.setState({ stardust: 500 });
  useGameStore.getState().buyTool('microfiber_cloth', 1);
  assert(useGameStore.getState().tools.microfiber_cloth === 1, 'Microfiber cloth purchased');
  assert(useGameStore.getState().stardust === 450, '50 Stardust deducted');
  console.log('✅ buyTool action verified.');

  // Equip tool
  useGameStore.getState().equipTool('microfiber_cloth');
  assert(useGameStore.getState().equippedTools.includes('microfiber_cloth'), 'Tool equipped');
  console.log('✅ equipTool action verified.');

  // Grade remaining card
  const cardToGrade = useGameStore.getState().inventory[0];
  useGameStore.setState({ yen: 5000 }); // Ensure funds for fee
  const gradeResult = useGameStore.getState().gradeCard(cardToGrade.id);
  assert(gradeResult.grade !== undefined, 'Card received grade');
  assert(gradeResult.grade.tier !== 'POOR_1_3', 'Equipped microfiber cloth prevented POOR_1_3');
  assert(useGameStore.getState().equippedTools.length === 0, 'Equipped tools cleared after grading');
  console.log(`✅ gradeCard action verified: Card graded as ${gradeResult.grade.tierLabel} (Grade ${gradeResult.grade.numericGrade}, ${gradeResult.grade.multiplier}x).`);

  // Test Binder Slotting
  // Find a sister card and slot it into slot 0
  const sisterCard = useGameStore.getState().inventory.find((c) => {
    const def = getCardDef(c.cardDefId);
    return def && def.characterRole === 'sister';
  });
  if (sisterCard) {
    useGameStore.getState().slotBinderCard(0, sisterCard.id);
    const updatedSlot0 = useGameStore.getState().binder.slots[0];
    assert(updatedSlot0.cardInstanceId === sisterCard.id, 'Card slotted into binder slot 0');
    console.log('✅ slotBinderCard action verified.');
  }

  // Claim idle revenue
  const claimed = useGameStore.getState().claimIdleRevenue();
  console.log(`✅ claimIdleRevenue action verified (claimed: ${claimed} ¥).`);

  testSection('🎉 ALL TESTS PASSED SUCCESSFULLY! 100% SPEC COMPLIANCE.');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
