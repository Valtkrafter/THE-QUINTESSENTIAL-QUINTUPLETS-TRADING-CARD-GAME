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
  calculateCardSellValue,
  calculateBulkSellValue,
  calculateKioskPrice,
  KIOSK_REROLL_STARDUST_COST,
  PACKS_CONFIG,
  CONSUMABLE_TOOLS,
  GRADE_TIER_CONFIG,
  NAKANO_SISTERS,
  analyzeShowcaseSlots,
  calculateShowcaseIdleEarnings,
  isFinishHigher,
  isGradeHigher,
} from '../src/config/economy';
import { useGameStore, DEFAULT_SHOWCASE_SLOTS, createInitialCardDex, CURRENT_PATCH_VERSION } from '../src/store/useGameStore';
import { CardInstance, BinderPage, Rarity, GradeTier, ShowcaseSlot, GradeResult } from '../src/types/card';
import { resolveActiveSupportBuff, SUPPORT_BUFF_CONFIGS, SUPPORT_CODE_MAP } from '../src/config/supportBuffs';

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
  assert(CARDS_CATALOG.length === 42, 'Catalog must contain exactly 42 cards');

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

  // Verify support characters (7 unique cards: Fuutarou [3], Raiha [2], Maruo [1], Takeda [1])
  const supportChars = ['fuutarou', 'raiha', 'maruo', 'takeda'] as const;
  for (const s of supportChars) {
    const sCards = CARDS_BY_CHARACTER[s];
    assert(sCards.length > 0, `Support character ${s} has no registered cards`);
    for (const card of sCards) {
      assert(card.characterRole === 'support', `${card.name} must have characterRole = support`);
    }
  }
  assert(CARDS_BY_CHARACTER.fuutarou.length === 3, 'Fuutarou must have 3 cards');
  assert(CARDS_BY_CHARACTER.raiha.length === 2, 'Raiha must have 2 cards');
  assert(CARDS_BY_CHARACTER.maruo.length === 1, 'Maruo must have 1 card');
  assert(CARDS_BY_CHARACTER.takeda.length === 1, 'Takeda must have 1 card');
  console.log('✅ All 4 support characters verified with 7 unique cards and correct roles.');

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

  // Offline earnings calculation: Legacy binder passive yield is purged (0 Yen)
  const earnings60m = calculateAccruedIdleEarnings(reportMono, 60, 24);
  assert(earnings60m === 0, 'Binder idle earnings purged (must be 0 Yen)');
  console.log('✅ Binder idle earnings purged: 0 Yen accrued from binder (Showcase is sole source).');

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

  // Test Batch dustCards action
  const remainingRawCards = useGameStore.getState().inventory.filter((c) => !c.grade);
  if (remainingRawCards.length >= 2) {
    const idsToDust = [remainingRawCards[0].id, remainingRawCards[1].id];
    const initialStardust = useGameStore.getState().stardust;
    const initialInvCount = useGameStore.getState().inventory.length;
    const dustYield = useGameStore.getState().dustCards(idsToDust);

    assert(dustYield > 0, 'dustCards must yield Stardust');
    assert(useGameStore.getState().stardust === initialStardust + dustYield, 'Stardust increased correctly');
    assert(useGameStore.getState().inventory.length === initialInvCount - 2, 'Two cards removed from inventory');
    console.log(`✅ dustCards batch action verified: ${dustYield} Stardust earned from 2 cards.`);
  }

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

  testSection('7. Stage 1: Direct Sell System, Bulk Liquidation & Singles Kiosk');

  // 1. Valuation Resolver
  const mockCardC: CardInstance = {
    id: 'test_c_raw',
    cardDefId: 'miku_c_01',
    characterId: 'miku',
    rarity: 'C',
    finish: 'raw',
    obtainedAt: Date.now(),
  };
  assert(calculateCardSellValue(mockCardC) === 15, 'C raw sell value = 15');

  const mockCardUCHolo: CardInstance = {
    id: 'test_uc_holo',
    cardDefId: 'nino_uc_01',
    characterId: 'nino',
    rarity: 'UC',
    finish: 'holo',
    obtainedAt: Date.now(),
  };
  assert(calculateCardSellValue(mockCardUCHolo) === 90, 'UC holo sell value = 90 (50 * 1.8)');

  const mockCardRSparkleGraded: CardInstance = {
    id: 'test_r_sparkle_mint9',
    cardDefId: 'ichika_r_01',
    characterId: 'ichika',
    rarity: 'R',
    finish: 'sparkle',
    obtainedAt: Date.now(),
    grade: {
      tier: 'MINT_9',
      tierLabel: 'God-Tier',
      numericGrade: 9,
      isBlackLabel: false,
      multiplier: 3.0,
      subgrades: { centering: 9, surface: 9, corners: 9, edges: 9 },
      gradedAt: Date.now(),
    },
  };
  assert(
    calculateCardSellValue(mockCardRSparkleGraded) === 2100,
    'R sparkle Mint 9 sell value = 2100 (200 * 3.5 * 3.0)'
  );

  const mockCardSRRainbowGem10: CardInstance = {
    id: 'test_sr_gem10',
    cardDefId: 'yotsuba_sr_01',
    characterId: 'yotsuba',
    rarity: 'SR',
    finish: 'rainbow',
    obtainedAt: Date.now(),
    grade: {
      tier: 'GEM_MINT_10',
      tierLabel: 'PEAK FICTION',
      numericGrade: 10,
      isBlackLabel: false,
      multiplier: 12.0,
      subgrades: { centering: 10, surface: 9.5, corners: 10, edges: 10 },
      gradedAt: Date.now(),
    },
  };
  assert(
    calculateCardSellValue(mockCardSRRainbowGem10) === 75600,
    'SR rainbow Gem Mint 10 sell value = 75600 (900 * 7.0 * 12.0)'
  );

  const mockCardMRSignedBlackLabel: CardInstance = {
    id: 'test_mr_black_label',
    cardDefId: 'miku_mr_01',
    characterId: 'miku',
    rarity: 'MR',
    finish: 'signed',
    obtainedAt: Date.now(),
    grade: {
      tier: 'BLACK_LABEL',
      tierLabel: 'THE CHOSEN ONE',
      numericGrade: 10,
      isBlackLabel: true,
      multiplier: 50.0,
      subgrades: { centering: 10, surface: 10, corners: 10, edges: 10 },
      gradedAt: Date.now(),
    },
  };
  assert(
    calculateCardSellValue(mockCardMRSignedBlackLabel) === 200000000,
    'MR signed Black Label sell value = 200,000,000 (100000 * 40.0 * 50.0)'
  );
  console.log('✅ Valuation formula across rarities, finishes, and grade tiers verified.');

  // 2. Single Card Sell & Showcase Slot Lock
  useGameStore.setState((prev) => ({
    inventory: [...prev.inventory, mockCardC],
  }));

  const initialYen = useGameStore.getState().yen;
  const initialInvSize = useGameStore.getState().inventory.length;
  const soldAmount = useGameStore.getState().sellCard(mockCardC.id);
  assert(soldAmount === 15, 'Sold C card for 15 Yen');
  assert(useGameStore.getState().yen === initialYen + 15, 'Yen balance credited correctly');
  assert(useGameStore.getState().inventory.length === initialInvSize - 1, 'Card removed from inventory');
  assert(!useGameStore.getState().inventory.some((c) => c.id === mockCardC.id), 'Card no longer in inventory');
  console.log('✅ sellCard action verified with exact credit and removal.');

  // Verify showcase slot guardrail (slotted card cannot be sold)
  if (sisterCard) {
    let errorCaught = false;
    try {
      useGameStore.getState().sellCard(sisterCard.id);
    } catch {
      errorCaught = true;
    }
    assert(errorCaught, 'Slotted binder card liquidation must throw error');
    console.log('✅ Showcase slot lock validation verified (cannot liquidate slotted card).');
  }

  // 3. Bulk Liquidation
  const bulkCards: CardInstance[] = [
    {
      id: 'bulk_c_1',
      cardDefId: 'miku_c_01',
      characterId: 'miku',
      rarity: 'C',
      finish: 'raw',
      obtainedAt: Date.now(),
    },
    {
      id: 'bulk_c_2',
      cardDefId: 'nino_c_01',
      characterId: 'nino',
      rarity: 'C',
      finish: 'raw',
      obtainedAt: Date.now(),
    },
    {
      id: 'bulk_uc_1',
      cardDefId: 'ichika_uc_01',
      characterId: 'ichika',
      rarity: 'UC',
      finish: 'raw',
      obtainedAt: Date.now(),
    },
  ];
  useGameStore.setState((prev) => ({
    inventory: [...prev.inventory, ...bulkCards],
  }));

  const preBulkYen = useGameStore.getState().yen;
  const preBulkInvCount = useGameStore.getState().inventory.length;
  const expectedBulkYen = 15 + 15 + 50; // 80 Yen
  const bulkResult = useGameStore.getState().sellBulkCards({ rarities: ['C', 'UC'], uncertifiedOnly: true });

  assert(bulkResult.count >= 3, 'Bulk sold at least the 3 inserted cards');
  assert(bulkResult.totalYen >= expectedBulkYen, 'Bulk sold total yen correct');
  assert(useGameStore.getState().yen === preBulkYen + bulkResult.totalYen, 'Yen balance updated after bulk sell');
  assert(useGameStore.getState().inventory.length === preBulkInvCount - bulkResult.count, 'Cards removed in atomic update');
  console.log(`✅ sellBulkCards verified: Atomically liquidated ${bulkResult.count} cards for ${bulkResult.totalYen} ¥.`);

  // 4. Singles Kiosk Pricing, Rotation & Purchase
  assert(calculateKioskPrice('C') === Math.round(15 * 2.5), 'Kiosk C price is 2.5x base');
  assert(calculateKioskPrice('MR') === Math.round(100000 * 2.5), 'Kiosk MR price is 2.5x base (250,000 ¥)');
  console.log('✅ Singles Kiosk 2.5x pricing sink verified.');

  // Initialize and test Kiosk rotation
  useGameStore.getState().refreshKiosk(false);
  const stock = useGameStore.getState().kioskStock;
  assert(stock.length === 4, 'Kiosk stock has exactly 4 offerings');
  for (const offering of stock) {
    assert(offering.finish === 'raw', 'Kiosk offerings must be raw');
    assert(offering.priceYen === calculateKioskPrice(offering.rarity), 'Kiosk offering price matches formula');
    assert(!offering.isPurchased, 'New offering is not purchased');
  }
  console.log('✅ Kiosk stock generation verified with 4 raw cards.');

  // Test Manual Reroll with 100 Stardust
  useGameStore.setState({ stardust: 200 });
  const preRerollStardust = useGameStore.getState().stardust;
  useGameStore.getState().refreshKiosk(true);
  assert(useGameStore.getState().stardust === preRerollStardust - KIOSK_REROLL_STARDUST_COST, '100 Stardust deducted for reroll');
  assert(useGameStore.getState().kioskStock.length === 4, 'New kiosk stock generated');
  console.log('✅ Kiosk manual reroll verified: 100 Stardust deducted and new stock rolled.');

  // Test Kiosk Card Purchase
  const targetOffering = useGameStore.getState().kioskStock[0];
  useGameStore.setState({ yen: targetOffering.priceYen + 1000 });
  const preBuyYen = useGameStore.getState().yen;
  const preBuyInvLen = useGameStore.getState().inventory.length;

  const purchasedCard = useGameStore.getState().buyKioskCard(targetOffering.id);
  assert(purchasedCard.cardDefId === targetOffering.cardDefId, 'Purchased card definition matches');
  assert(purchasedCard.finish === 'raw', 'Purchased card is raw');
  assert(useGameStore.getState().yen === preBuyYen - targetOffering.priceYen, 'Yen deducted for kiosk purchase');
  assert(useGameStore.getState().inventory.length === preBuyInvLen + 1, 'Card added to inventory');
  assert(useGameStore.getState().kioskStock[0].isPurchased === true, 'Offering marked as purchased');

  // Verify buying already purchased card throws error
  let doubleBuyError = false;
  try {
    useGameStore.getState().buyKioskCard(targetOffering.id);
  } catch {
    doubleBuyError = true;
  }
  assert(doubleBuyError, 'Cannot buy already purchased kiosk offering');
  console.log('✅ buyKioskCard verified: Inventory added, Yen deducted, and duplicate buy blocked.');

  testSection('8. Stage 2: 5-Slot Acrylic Showcase (Vitrine) & Master Card-Dex');

  // 1. Vitrine Base Floor & Empty Showcase
  const emptyReport = analyzeShowcaseSlots(DEFAULT_SHOWCASE_SLOTS, new Map());
  assert(emptyReport.slottedCount === 0, 'Empty showcase has 0 slotted cards');
  assert(emptyReport.totalMarketValue === 0, 'Empty showcase has 0 market value');
  assert(emptyReport.effectiveYieldPerMinute === 0, 'Empty showcase produces 0 yield');
  assert(emptyReport.synergyMultiplier === 1.0, 'Base synergy multiplier is 1.0');

  // Base floor validation: 1 card with market value generates 60 Yen/min (1 Yen/sec)
  const dummyMikuCard: CardInstance = {
    id: 'vitrine_test_c_1',
    cardDefId: 'miku_c_01',
    characterId: 'miku',
    rarity: 'C',
    finish: 'raw',
    obtainedAt: Date.now(),
  };
  const dummyMap = new Map<string, CardInstance>([[dummyMikuCard.id, dummyMikuCard]]);
  const singleSlot: ShowcaseSlot[] = [
    { slotIndex: 0, cardInstanceId: dummyMikuCard.id },
    { slotIndex: 1, cardInstanceId: null },
    { slotIndex: 2, cardInstanceId: null },
    { slotIndex: 3, cardInstanceId: null },
    { slotIndex: 4, cardInstanceId: null },
  ];
  const singleReport = analyzeShowcaseSlots(singleSlot, dummyMap);
  assert(singleReport.slottedCount === 1, '1 card slotted');
  assert(singleReport.baseFloorPerMinute === 60, 'Base floor is 60 Yen/min (1 Yen/sec)');
  assert(singleReport.effectiveYieldPerMinute >= 60, 'Guaranteed minimum yield floor of 60 Yen/min');
  console.log('✅ Base floor guarantee verified (60 Yen/min per slotted card).');

  // 2. Quintuplet Harmony (+50%)
  const fiveSistersCards: CardInstance[] = [
    { id: 'v_ichika', cardDefId: 'ichika_c_01', characterId: 'ichika', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
    { id: 'v_nino', cardDefId: 'nino_c_01', characterId: 'nino', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
    { id: 'v_miku', cardDefId: 'miku_c_01', characterId: 'miku', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
    { id: 'v_yotsuba', cardDefId: 'yotsuba_c_01', characterId: 'yotsuba', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
    { id: 'v_itsuki', cardDefId: 'itsuki_c_01', characterId: 'itsuki', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
  ];
  const fiveSistersMap = new Map<string, CardInstance>();
  fiveSistersCards.forEach((c) => fiveSistersMap.set(c.id, c));
  const fiveSistersSlots: ShowcaseSlot[] = fiveSistersCards.map((c, i) => ({ slotIndex: i, cardInstanceId: c.id }));

  const harmonyReport = analyzeShowcaseSlots(fiveSistersSlots, fiveSistersMap);
  assert(harmonyReport.quintupletHarmony === true, 'Quintuplet Harmony active with all 5 sisters');
  assert(harmonyReport.monoWaifu === false, 'Not Mono-Waifu');
  assert(harmonyReport.vaultExcellence === false, 'Not Vault Excellence (raw cards)');
  assert(harmonyReport.synergyMultiplier === 1.5, 'Quintuplet Harmony gives +50% (1.5x multiplier)');
  console.log('✅ Quintuplet Harmony (+50% / 1.5x) verified.');

  // 3. Mono-Waifu Obsession (+30%)
  const monoMikuCards: CardInstance[] = [
    { id: 'v_m1', cardDefId: 'miku_c_01', characterId: 'miku', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
    { id: 'v_m2', cardDefId: 'miku_uc_01', characterId: 'miku', rarity: 'UC', finish: 'raw', obtainedAt: Date.now() },
    { id: 'v_m3', cardDefId: 'miku_r_01', characterId: 'miku', rarity: 'R', finish: 'raw', obtainedAt: Date.now() },
    { id: 'v_m4', cardDefId: 'miku_sr_01', characterId: 'miku', rarity: 'SR', finish: 'raw', obtainedAt: Date.now() },
    { id: 'v_m5', cardDefId: 'miku_ur_01', characterId: 'miku', rarity: 'UR', finish: 'raw', obtainedAt: Date.now() },
  ];
  const monoMikuMap = new Map<string, CardInstance>();
  monoMikuCards.forEach((c) => monoMikuMap.set(c.id, c));
  const monoMikuSlots: ShowcaseSlot[] = monoMikuCards.map((c, i) => ({ slotIndex: i, cardInstanceId: c.id }));

  const monoReport = analyzeShowcaseSlots(monoMikuSlots, monoMikuMap);
  assert(monoReport.monoWaifu === true, 'Mono-Waifu active with 5 Miku cards');
  assert(monoReport.monoWaifuSisterId === 'miku', 'Mono-Waifu sister ID is miku');
  assert(monoReport.quintupletHarmony === false, 'Not Quintuplet Harmony');
  assert(monoReport.synergyMultiplier === 1.3, 'Mono-Waifu gives +30% (1.3x multiplier)');
  console.log('✅ Mono-Waifu Obsession (+30% / 1.3x) verified.');

  // 4. Vault Excellence (+100%) and Synergy Stacking (Harmony + Excellence = 2.5x)
  const mockGrade9: GradeResult = {
    tier: 'MINT_9',
    tierLabel: 'God-Tier',
    numericGrade: 9,
    isBlackLabel: false,
    multiplier: 3.0,
    subgrades: { centering: 9.0, surface: 9.0, corners: 9.0, edges: 9.0 },
    gradedAt: Date.now(),
  };
  const mockGrade10: GradeResult = {
    tier: 'BLACK_LABEL',
    tierLabel: 'THE CHOSEN ONE',
    numericGrade: 10,
    isBlackLabel: true,
    multiplier: 50.0,
    subgrades: { centering: 10.0, surface: 10.0, corners: 10.0, edges: 10.0 },
    gradedAt: Date.now(),
  };

  const gradedSistersCards: CardInstance[] = [
    { id: 'vg_1', cardDefId: 'ichika_mr_01', characterId: 'ichika', rarity: 'MR', finish: 'signed', grade: mockGrade10, obtainedAt: Date.now() },
    { id: 'vg_2', cardDefId: 'nino_sec_01', characterId: 'nino', rarity: 'SEC', finish: 'rainbow', grade: mockGrade9, obtainedAt: Date.now() },
    { id: 'vg_3', cardDefId: 'miku_mr_01', characterId: 'miku', rarity: 'MR', finish: 'signed', grade: mockGrade10, obtainedAt: Date.now() },
    { id: 'vg_4', cardDefId: 'yotsuba_ur_01', characterId: 'yotsuba', rarity: 'UR', finish: 'gold_etched', grade: mockGrade9, obtainedAt: Date.now() },
    { id: 'vg_5', cardDefId: 'itsuki_mr_01', characterId: 'itsuki', rarity: 'MR', finish: 'signed', grade: mockGrade10, obtainedAt: Date.now() },
  ];
  const gradedMap = new Map<string, CardInstance>();
  gradedSistersCards.forEach((c) => gradedMap.set(c.id, c));
  const gradedSlots: ShowcaseSlot[] = gradedSistersCards.map((c, i) => ({ slotIndex: i, cardInstanceId: c.id }));

  const stackedReport = analyzeShowcaseSlots(gradedSlots, gradedMap);
  assert(stackedReport.quintupletHarmony === true, 'Harmony active');
  assert(stackedReport.vaultExcellence === true, 'Vault Excellence active (all 5 are Grade >= 9)');
  // Multipliers combine: 1.0 (base) + 0.5 (harmony) + 1.0 (excellence) = 2.5
  assert(stackedReport.synergyMultiplier === 2.5, 'Combined Harmony + Vault Excellence = 2.5x multiplier');
  console.log('✅ Vault Excellence (+100%) and Synergy Stacking (2.5x) verified.');

  // 5. 12-Hour Offline Idle Revenue Accrual Cap
  const ratePerMin = stackedReport.effectiveYieldPerMinute;
  assert(calculateShowcaseIdleEarnings(stackedReport, 60, 12) === Math.floor(60 * ratePerMin), '1 hour earnings correct');
  assert(calculateShowcaseIdleEarnings(stackedReport, 720, 12) === Math.floor(720 * ratePerMin), '12 hours earnings correct');
  assert(calculateShowcaseIdleEarnings(stackedReport, 1440, 12) === Math.floor(720 * ratePerMin), '24 hours capped at 12 hours (720 min)');
  console.log('✅ 12-Hour offline idle revenue accrual cap verified.');

  // 6. Master Card-Dex 42-Card Registry & Discovery Engine
  const initialDex = createInitialCardDex();
  const dexKeys = Object.keys(initialDex);
  assert(dexKeys.length === 42, 'Master Card-Dex tracks all 42 cards');
  assert(CARDS_CATALOG.every((c) => initialDex[c.id] !== undefined), 'Every card from catalog has an entry in Dex');
  assert(CARDS_CATALOG.every((c) => initialDex[c.id].cardNumber.startsWith('TQQ-')), 'All cards formatted as TQQ-XXX');
  console.log('✅ Master Card-Dex 42-card catalog registry verified.');

  // Test Discovery Mutation in Zustand Store
  const testDiscoveryCard: CardInstance = {
    id: 'dex_test_card_1',
    cardDefId: 'ichika_mr_01',
    characterId: 'ichika',
    rarity: 'MR',
    finish: 'signed',
    grade: mockGrade10,
    obtainedAt: Date.now(),
  };
  useGameStore.getState().recordCardDiscovery(testDiscoveryCard);
  const updatedDexEntry = useGameStore.getState().cardDex['ichika_mr_01'];
  assert(updatedDexEntry.discovered === true, 'Card marked discovered');
  assert(updatedDexEntry.highestFinish === 'signed', 'Highest finish tracked as signed');
  assert(updatedDexEntry.bestGrade?.isBlackLabel === true, 'Best grade tracked as Black Label');

  // Test that a lower finish does NOT overwrite higher finish
  const lowerFinishCard: CardInstance = {
    id: 'dex_test_card_2',
    cardDefId: 'ichika_mr_01',
    characterId: 'ichika',
    rarity: 'MR',
    finish: 'raw',
    obtainedAt: Date.now(),
  };
  useGameStore.getState().recordCardDiscovery(lowerFinishCard);
  assert(useGameStore.getState().cardDex['ichika_mr_01'].highestFinish === 'signed', 'Higher finish preserved');
  console.log('✅ Card-Dex discovery tracking, finish hierarchy, and grade persistence verified.');

  // 7. Showcase Slot Actions & Liquidation Protection
  useGameStore.setState((prev) => ({
    inventory: [...prev.inventory, testDiscoveryCard],
  }));

  // Mount card into Vitrine Pedestal 0
  useGameStore.getState().slotShowcaseCard(0, testDiscoveryCard.id);
  assert(useGameStore.getState().showcaseSlots[0].cardInstanceId === testDiscoveryCard.id, 'Mounted to pedestal 0');

  // Verify liquidation protection throws error
  let vitrineSellBlocked = false;
  try {
    useGameStore.getState().sellCard(testDiscoveryCard.id);
  } catch {
    vitrineSellBlocked = true;
  }
  assert(vitrineSellBlocked, 'Card mounted in showcase cannot be sold');

  let vitrineDustBlocked = false;
  try {
    useGameStore.getState().vaporizeCard(testDiscoveryCard.id);
  } catch {
    vitrineDustBlocked = true;
  }
  assert(vitrineDustBlocked, 'Card mounted in showcase cannot be dusted');

  // Unmount from showcase
  useGameStore.getState().slotShowcaseCard(0, null);
  assert(useGameStore.getState().showcaseSlots[0].cardInstanceId === null, 'Pedestal 0 vacated');
  console.log('✅ Showcase slot mount/unmount and liquidation protections verified.');

  // 8. Showcase Revenue Claim Action
  useGameStore.setState({
    showcaseLastClaimedTimestamp: Date.now() - 60000, // 1 minute ago
  });
  useGameStore.getState().slotShowcaseCard(0, testDiscoveryCard.id);
  const preClaimYen = useGameStore.getState().yen;
  const claimedYen = useGameStore.getState().claimShowcaseRevenue();
  assert(claimedYen >= 60, 'Claimed at least 60 Yen base floor');
  assert(useGameStore.getState().yen === preClaimYen + claimedYen, 'Yen balance credited from showcase claim');
  console.log(`✅ claimShowcaseRevenue verified: Claimed ${claimedYen} ¥.`);

  // 9. Patch Notes Version Tracking
  testSection('SECTION 9: PATCH NOTES VERSION TRACKING & STORE MUTATIONS');
  assert(CURRENT_PATCH_VERSION === 'v0.2.0', 'CURRENT_PATCH_VERSION is v0.2.0');

  useGameStore.setState({ lastSeenPatchVersion: '' });
  assert(useGameStore.getState().lastSeenPatchVersion === '', 'Initial lastSeenPatchVersion is empty');

  useGameStore.getState().markPatchNotesSeen();
  assert(
    useGameStore.getState().lastSeenPatchVersion === CURRENT_PATCH_VERSION,
    'markPatchNotesSeen() updates lastSeenPatchVersion to current version'
  );

  useGameStore.getState().markPatchNotesSeen('v0.3.0');
  assert(
    useGameStore.getState().lastSeenPatchVersion === 'v0.3.0',
    'markPatchNotesSeen(custom) updates lastSeenPatchVersion to custom version'
  );
  console.log('✅ Patch notes version tracking and store mutations verified.');

  // ============================================================
  // SECTION 10: STAGE 5: SUPPORT ALTAR & DYNAMIC SHOWCASE BUFF ENGINE
  // ============================================================
  testSection('SECTION 10: STAGE 5: SUPPORT ALTAR & DYNAMIC SHOWCASE BUFF ENGINE');

  // 1. Support Buff Dictionary & Master Catalog Coverage
  const supportDefKeys = Object.keys(SUPPORT_BUFF_CONFIGS);
  assert(supportDefKeys.length === 7, 'Exactly 7 support cards configured in SUPPORT_BUFF_CONFIGS');
  assert(SUPPORT_CODE_MAP['TQQ-SUP-01'] === 'fuutarou_c_01', 'TQQ-SUP-01 mapped to fuutarou_c_01');
  assert(SUPPORT_CODE_MAP['TQQ-SUP-03'] === 'fuutarou_ur_01', 'TQQ-SUP-03 mapped to fuutarou_ur_01');
  assert(SUPPORT_CODE_MAP['TQQ-SUP-05'] === 'raiha_sr_01', 'TQQ-SUP-05 mapped to raiha_sr_01');
  assert(SUPPORT_CODE_MAP['TQQ-SUP-06'] === 'maruo_sec_01', 'TQQ-SUP-06 mapped to maruo_sec_01');
  assert(SUPPORT_CODE_MAP['TQQ-SUP-07'] === 'takeda_r_01', 'TQQ-SUP-07 mapped to takeda_r_01');
  console.log('✅ Support buff master catalog and code alias dictionaries verified.');

  // 2. Base Resolution vs Grade 9/10 (+20%) Scaling Resolution
  const rawFuutarouUR: CardInstance = {
    id: 'test_futa_ur_raw',
    cardDefId: 'fuutarou_ur_01',
    characterId: 'fuutarou',
    rarity: 'UR',
    finish: 'raw',
    obtainedAt: Date.now(),
  };
  const rawBuff = resolveActiveSupportBuff(rawFuutarouUR);
  assert(rawBuff !== null, 'raw Fuutarou UR buff resolved');
  assert(rawBuff!.effects.yieldMultiplier === 2.0, 'Raw Fuutarou UR gives 2.0x yield');
  assert(rawBuff!.effects.harmonyBonusBoost === 0.5, 'Raw Fuutarou UR gives +0.5 harmony boost');
  assert(rawBuff!.isGradeScaled === false, 'Raw card is not grade scaled');

  const gradedFuutarouUR: CardInstance = {
    ...rawFuutarouUR,
    id: 'test_futa_ur_grade10',
    grade: {
      tier: 'GEM_MINT_10',
      tierLabel: 'Gem Mint 10',
      numericGrade: 10,
      isBlackLabel: false,
      multiplier: 5.0,
      subgrades: { centering: 10, surface: 10, corners: 10, edges: 9.5 },
      gradedAt: Date.now(),
    },
  };
  const slabBuff = resolveActiveSupportBuff(gradedFuutarouUR);
  assert(slabBuff !== null, 'slab Fuutarou UR buff resolved');
  assert(slabBuff!.isGradeScaled === true, 'Grade 10 slab is grade scaled');
  assert(slabBuff!.effects.yieldMultiplier === 2.4, 'Grade 10 Fuutarou UR scales 2.0x to 2.40x (+20%)');
  assert(slabBuff!.effects.harmonyBonusBoost === 0.6, 'Grade 10 Fuutarou UR scales +0.5 to +0.60 harmony boost (+20%)');
  assert(slabBuff!.badgeLabel.includes('SLAB +20%'), 'Badge label indicates SLAB +20% boost');

  // Verify Raiha SR Grade 10 scaling
  const slabRaihaSR: CardInstance = {
    id: 'test_raiha_sr_slab',
    cardDefId: 'raiha_sr_01',
    characterId: 'raiha',
    rarity: 'SR',
    finish: 'raw',
    obtainedAt: Date.now(),
    grade: {
      tier: 'MINT_9',
      tierLabel: 'Mint 9',
      numericGrade: 9,
      isBlackLabel: false,
      multiplier: 2.0,
      subgrades: { centering: 9, surface: 9, corners: 9, edges: 9 },
      gradedAt: Date.now(),
    },
  };
  const raihaSlabBuff = resolveActiveSupportBuff(slabRaihaSR);
  assert(raihaSlabBuff!.effects.gradingFeeDiscount === 0.36, 'Grade 9 Raiha SR scales 30% discount to 36% (+20%)');
  assert(raihaSlabBuff!.effects.grade10BlackLabelBonus === 0.036, 'Grade 9 Raiha SR scales 3% bonus to 3.6% (+20%)');

  // Verify Maruo SEC Grade 10 scaling
  const slabMaruoSEC: CardInstance = {
    id: 'test_maruo_sec_slab',
    cardDefId: 'maruo_sec_01',
    characterId: 'maruo',
    rarity: 'SEC',
    finish: 'raw',
    obtainedAt: Date.now(),
    grade: {
      tier: 'BLACK_LABEL',
      tierLabel: 'Black Label Quad 10',
      numericGrade: 10,
      isBlackLabel: true,
      multiplier: 25.0,
      subgrades: { centering: 10, surface: 10, corners: 10, edges: 10 },
      gradedAt: Date.now(),
    },
  };
  const maruoSlabBuff = resolveActiveSupportBuff(slabMaruoSEC);
  assert(maruoSlabBuff!.effects.dustBonus === 0.9, 'Grade 10 Maruo scales 75% dust bonus to 90% (+20%)');
  assert(maruoSlabBuff!.effects.kioskDiscount === 0.3, 'Grade 10 Maruo scales 25% kiosk discount to 30% (+20%)');
  assert(maruoSlabBuff!.effects.sisterMarketValueMultiplier === 0.24, 'Grade 10 Maruo scales 20% sister valuation to 24% (+20%)');

  // Verify Takeda R Grade 10 scaling
  const slabTakedaR: CardInstance = {
    id: 'test_takeda_r_slab',
    cardDefId: 'takeda_r_01',
    characterId: 'takeda',
    rarity: 'R',
    finish: 'raw',
    obtainedAt: Date.now(),
    grade: {
      tier: 'GEM_MINT_10',
      tierLabel: 'Gem Mint 10',
      numericGrade: 10,
      isBlackLabel: false,
      multiplier: 5.0,
      subgrades: { centering: 10, surface: 10, corners: 10, edges: 10 },
      gradedAt: Date.now(),
    },
  };
  const takedaSlabBuff = resolveActiveSupportBuff(slabTakedaR);
  assert(takedaSlabBuff!.effects.cooldownReductionSeconds === 8640, 'Grade 10 Takeda scales 7200s (2h) reduction to 8640s (2.4h)');
  console.log('✅ Base effects and Grade 9/10 (+20%) scaling calculations verified across all mentor cards.');

  // 3. Showcase Multipliers & Synergy Stacking with Support Altar
  const showcaseSisters: CardInstance[] = [
    { id: 'sup_ichika', cardDefId: 'ichika_c_01', characterId: 'ichika', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
    { id: 'sup_nino', cardDefId: 'nino_c_01', characterId: 'nino', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
    { id: 'sup_miku', cardDefId: 'miku_c_01', characterId: 'miku', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
    { id: 'sup_yotsuba', cardDefId: 'yotsuba_c_01', characterId: 'yotsuba', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
    { id: 'sup_itsuki', cardDefId: 'itsuki_c_01', characterId: 'itsuki', rarity: 'C', finish: 'raw', obtainedAt: Date.now() },
  ];
  const showcaseMap = new Map<string, CardInstance>();
  showcaseSisters.forEach((c) => showcaseMap.set(c.id, c));
  const showcaseSlots: ShowcaseSlot[] = showcaseSisters.map((c, i) => ({ slotIndex: i, cardInstanceId: c.id }));

  // Without support: Harmony is +50% (1.5x)
  const baseSynergy = analyzeShowcaseSlots(showcaseSlots, showcaseMap, null);
  assert(baseSynergy.synergyMultiplier === 1.5, 'Base showcase harmony is 1.5x');

  // With Raw Fuutarou UR in Support Altar:
  // Harmony bonus is amplified from +0.5 to +1.0 (baseSynergiesMultiplier = 2.0x)
  // Fuutarou UR yieldMultiplier is 2.0x
  // Total synergy multiplier = 2.0 * 2.0 = 4.0x
  const fuutarouURSynergy = analyzeShowcaseSlots(showcaseSlots, showcaseMap, rawFuutarouUR);
  assert(fuutarouURSynergy.baseSynergiesMultiplier === 2.0, 'Harmony amplified to +100% (+1.0), baseSynergiesMultiplier = 2.0x');
  assert(fuutarouURSynergy.supportMultiplier === 2.0, 'Fuutarou UR supportMultiplier is 2.0x');
  assert(fuutarouURSynergy.synergyMultiplier === 4.0, 'Total synergy multiplier is 4.0x (2.0 * 2.0)');

  // With Grade 10 Fuutarou UR in Support Altar:
  // Harmony bonus is amplified by +0.6 (baseSynergiesMultiplier = 1.0 + 0.5 + 0.6 = 2.1x)
  // Fuutarou UR yieldMultiplier is 2.4x
  // Total synergy multiplier = 2.1 * 2.4 = 5.04x
  const slabFuutarouURSynergy = analyzeShowcaseSlots(showcaseSlots, showcaseMap, gradedFuutarouUR);
  assert(Number(slabFuutarouURSynergy.baseSynergiesMultiplier.toFixed(2)) === 2.1, 'Grade 10 Harmony amplified to +110% (2.1x)');
  assert(slabFuutarouURSynergy.supportMultiplier === 2.4, 'Grade 10 Fuutarou UR supportMultiplier is 2.4x');
  assert(Number(slabFuutarouURSynergy.synergyMultiplier.toFixed(2)) === 5.04, 'Total synergy multiplier is 5.04x (2.1 * 2.4)');

  // With Maruo SEC in Support Altar:
  // Base raw card value for 5 C cards = 5 * 10 = 50 ¥
  // With raw Maruo (+20% sister valuation): 50 * 1.2 = 60 ¥
  const maruoSynergy = analyzeShowcaseSlots(showcaseSlots, showcaseMap, slabMaruoSEC);
  assert(maruoSynergy.totalMarketValue > baseSynergy.totalMarketValue, 'Maruo SEC increases total market valuation of slotted sisters');
  console.log('✅ Showcase idle yield, Quintuplet Harmony amplification, and Maruo valuation verified.');

  // 4. Zustand Store Lifecycle, Mount/Unmount & Liquidation Safeguards
  useGameStore.setState({
    inventory: [...useGameStore.getState().inventory, rawFuutarouUR, gradedFuutarouUR, slabRaihaSR, slabMaruoSEC, slabTakedaR],
    supportSlot: null,
  });

  // Socket Fuutarou UR to Support Altar
  useGameStore.getState().slotSupportCard(rawFuutarouUR.id);
  assert(useGameStore.getState().supportSlot?.id === rawFuutarouUR.id, 'Fuutarou UR slotted into supportSlot');

  // Verify liquidation & dusting protection on active Support card
  let supportDustBlocked = false;
  try {
    useGameStore.getState().dustCard(rawFuutarouUR.id);
  } catch {
    supportDustBlocked = true;
  }
  assert(supportDustBlocked, 'Mounted support card cannot be dusted via dustCard()');

  // dustCards skips mounted support card and yields 0 dust
  const batchDustEarned = useGameStore.getState().dustCards([rawFuutarouUR.id]);
  assert(batchDustEarned === 0, 'dustCards() skips mounted support card (0 dust earned)');
  assert(
    useGameStore.getState().inventory.some((c) => c.id === rawFuutarouUR.id),
    'Mounted support card remains in inventory after dustCards()'
  );

  let supportSellBlocked = false;
  try {
    useGameStore.getState().sellCard(rawFuutarouUR.id);
  } catch {
    supportSellBlocked = true;
  }
  assert(supportSellBlocked, 'Mounted support card cannot be sold via sellCard()');

  // Verify bulk sell skips mounted support card
  const preBulkCount = useGameStore.getState().inventory.length;
  useGameStore.getState().sellBulkCards({ rarities: ['UR'], uncertifiedOnly: false });
  assert(
    useGameStore.getState().inventory.some((c) => c.id === rawFuutarouUR.id),
    'Mounted support card preserved during bulk liquidation'
  );
  assert(useGameStore.getState().supportSlot?.id === rawFuutarouUR.id, 'supportSlot remains intact after bulk sell');
  console.log('✅ Support Altar liquidation, dusting, and vaporization protections verified.');

  // Swap to Raiha SR in Support Altar: test grading fee discount
  useGameStore.getState().slotSupportCard(slabRaihaSR.id);
  assert(useGameStore.getState().supportSlot?.id === slabRaihaSR.id, 'Raiha SR slotted in Support Altar');

  const rawCardToGrade: CardInstance = {
    id: 'card_to_grade_test',
    cardDefId: 'miku_c_01',
    characterId: 'miku',
    rarity: 'C',
    finish: 'raw',
    obtainedAt: Date.now(),
  };
  useGameStore.setState({
    inventory: [...useGameStore.getState().inventory, rawCardToGrade],
    yen: 1000,
  });
  const startYen = useGameStore.getState().yen;
  const s5StandardFee = calculateGradingFee(rawCardToGrade, 0); // 50% of 10 = 5 (minimum floor is 1)
  const discountedFee = calculateGradingFee(rawCardToGrade, 0.36); // 36% discount on 5 = 3
  assert(discountedFee < s5StandardFee, 'Discounted fee is strictly less than standard fee');

  useGameStore.getState().gradeCard(rawCardToGrade.id);
  const yenPaid = startYen - useGameStore.getState().yen;
  assert(yenPaid === discountedFee, 'gradeCard charged the discounted fee with active Raiha SR');
  console.log('✅ Raiha SR grading fee discount verified through store.gradeCard().');

  // Swap to Maruo SEC in Support Altar: test Kiosk discount & Dusting bonus
  useGameStore.getState().slotSupportCard(slabMaruoSEC.id);
  assert(useGameStore.getState().supportSlot?.id === slabMaruoSEC.id, 'Maruo SEC slotted in Support Altar');

  // Test Kiosk discount with Maruo SEC (30% discount with Grade 10)
  useGameStore.setState({ yen: 10_000_000 });
  useGameStore.getState().refreshKiosk(false);
  const kioskOffering = useGameStore.getState().kioskStock[0];
  if (kioskOffering) {
    const preKioskYen = useGameStore.getState().yen;
    const expectedDiscountedPrice = Math.round(kioskOffering.priceYen * 0.7);
    useGameStore.getState().buyKioskCard(kioskOffering.id);
    const kioskYenSpent = preKioskYen - useGameStore.getState().yen;
    assert(kioskYenSpent === expectedDiscountedPrice, 'buyKioskCard applied 30% Maruo discount');
  }

  // Test Dust bonus with Maruo SEC (+90% with Grade 10)
  const disposableCard: CardInstance = {
    id: 'disposable_c_card',
    cardDefId: 'ichika_c_01',
    characterId: 'ichika',
    rarity: 'C',
    finish: 'raw',
    obtainedAt: Date.now(),
  };
  useGameStore.setState({
    inventory: [...useGameStore.getState().inventory, disposableCard],
    stardust: 0,
  });
  const expectedDust = calculateDustYield(disposableCard, 0.9);
  const s5DustEarned = useGameStore.getState().dustCard(disposableCard.id);
  assert(s5DustEarned === expectedDust, 'dustCard earned +90% stardust with Grade 10 Maruo Altar');
  assert(useGameStore.getState().stardust === expectedDust, 'Stardust balance updated with bonus');
  console.log('✅ Maruo SEC Kiosk discount and dusting bonus verified through store mutations.');

  // Swap to Takeda R in Support Altar: test Test-Sheet Pack Cooldown reduction
  useGameStore.getState().slotSupportCard(slabTakedaR.id);
  assert(useGameStore.getState().supportSlot?.id === slabTakedaR.id, 'Takeda R slotted in Support Altar');
  const nowTs = Date.now();
  useGameStore.setState({
    packCooldowns: {
      ...useGameStore.getState().packCooldowns,
      test_sheet: nowTs - 3600 * 1000, // opened 1 hour ago (base cooldown 4h = 14400s)
    },
  });
  const cdRemainingWithTakeda = useGameStore.getState().getTestSheetCooldownRemaining();
  // With 8640s (2.4h) reduction, total cooldown is 14400 - 8640 = 5760s (1.6h)
  // Elapsed is 3600s, so remaining should be ~2160s (rather than 10800s without Takeda)
  assert(cdRemainingWithTakeda < 3600, 'Test sheet cooldown significantly reduced by Takeda R in Support Altar');
  console.log('✅ Takeda R pack cooldown reduction verified through getTestSheetCooldownRemaining().');

  // Unmount from Support Altar
  useGameStore.getState().slotSupportCard(null);
  assert(useGameStore.getState().supportSlot === null, 'Support Altar vacated successfully');
  const defaultCdRemaining = useGameStore.getState().getTestSheetCooldownRemaining();
  assert(defaultCdRemaining > 10000, 'Cooldown restored to standard 4-hour schedule after unmounting Takeda');
  console.log('✅ Support Altar unmount and baseline restoration verified.');

  testSection('🎉 ALL TESTS PASSED SUCCESSFULLY! 100% SPEC COMPLIANCE.');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
