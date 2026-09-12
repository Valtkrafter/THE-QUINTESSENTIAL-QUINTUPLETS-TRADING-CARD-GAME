import type { MotionValue } from 'framer-motion';

export interface CardLightState {
  lightX: MotionValue<string>;
  lightY: MotionValue<string>;
  foilAngle: MotionValue<string>;
  sheenOpacity: MotionValue<number>;
}

export type SisterId = 'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki';

export type SupportId = 'fuutarou' | 'raiha' | 'maruo' | 'isanari' | 'takeda';

export type CharacterId = SisterId | SupportId;

export type CharacterRole = 'sister' | 'support';

export type Rarity = 'C' | 'UC' | 'R' | 'SR' | 'UR' | 'SEC' | 'MR';

export type Finish =
  | 'raw'
  | 'holo'
  | 'sparkle'
  | 'rainbow'
  | 'gold_etched'
  | 'signed';

export type GradeTier =
  | 'POOR_1_3'
  | 'USED_4_6'
  | 'CRISP_7_8'
  | 'MINT_9'
  | 'GEM_MINT_10'
  | 'BLACK_LABEL';

export interface GradeSubgrades {
  centering: number;
  surface: number;
  corners: number;
  edges: number;
}

export interface GradeResult {
  tier: GradeTier;
  tierLabel: string;
  numericGrade: number; // 1 to 10
  isBlackLabel: boolean;
  multiplier: number;
  subgrades: GradeSubgrades;
  gradedAt: number;
}

export interface CardDefinition {
  id: string; // unique card definition key e.g. "nakano_miku_mr_01"
  cardNumber: string; // collector numbering e.g. "TQQ-001"
  characterId: CharacterId;
  characterRole: CharacterRole;
  name: string;
  title: string;
  rarity: Rarity;
  loreQuote: string;
  description: string;
  imageUrl?: string;
  forceFit?: 'exact' | 'top' | 'contain';
}

export interface CardInstance {
  id: string; // unique per pulled copy (UUID)
  cardDefId: string;
  characterId: CharacterId;
  rarity: Rarity;
  finish: Finish;
  obtainedAt: number;
  grade?: GradeResult; // undefined if raw card
  isLocked?: boolean;
  slottedBinder?: {
    pageId: string;
    slotIndex: number;
  };
  imageUrl?: string;
  name?: string;
  title?: string;
  cardNumber?: string;
  forceFit?: 'exact' | 'top' | 'contain';
}

export type PackId =
  | 'test_sheet'
  | 'kiosk'
  | 'lernsession'
  | 'sommerfeuerwerk'
  | 'schulfest'
  | 'klassenfahrt_kyoto'
  | 'braut_schicksal'
  | 'god_pack';

export type DropTable = Record<Rarity, number>; // Drop rates expressed as percentages (0 to 100)

export interface PackConfig {
  id: PackId;
  name: string;
  description: string;
  costYen: number;
  slots: number;
  dropTable: DropTable;
  cooldownSeconds?: number;
  isGodPack?: boolean;
  canTriggerGodPack?: boolean;
}

export type ConsumableToolId =
  | 'microfiber_cloth'
  | 'centering_laser'
  | 'vault_insurance';

export interface ConsumableTool {
  id: ConsumableToolId;
  name: string;
  description: string;
  stardustCost: number;
}

export interface BinderSlot {
  slotIndex: number; // 0..4 for sisters, 5 for support
  allowedRole: CharacterRole;
  cardInstanceId: string | null;
}

export interface BinderPage {
  id: string;
  name: string;
  slots: BinderSlot[]; // Exactly 6 slots (0-4: sister, 5: support)
}

export interface BinderSynergyReport {
  allFiveSisters: boolean;
  monoWaifu: boolean;
  monoWaifuSisterId: SisterId | null;
  supportCharacterId: SupportId | null;
  synergyMultiplier: number;
  totalMarketValue: number;
  baseYieldPerMinute: number;
  effectiveYieldPerMinute: number;
}

export interface PityCounters {
  packsWithoutSR: number;
  packsWithoutUR: number;
}

export interface OpenPackResult {
  packId: PackId;
  isGodPack: boolean;
  cards: CardInstance[];
  costPaid: number;
  pityTriggered: 'SR' | 'UR' | null;
  newPityCounters: PityCounters;
}

export interface GradingResultInfo {
  card: CardInstance;
  grade: GradeResult;
  gradingFeePaid: number;
  usedTools: ConsumableToolId[];
  insuranceRerolled: boolean;
}

export interface KioskOffering {
  id: string;
  cardDefId: string;
  rarity: Rarity;
  finish: Finish;
  priceYen: number;
  isPurchased: boolean;
}

export interface BulkSellFilter {
  rarities: Rarity[];
  uncertifiedOnly: boolean;
}

export interface BulkSellResult {
  count: number;
  totalYen: number;
  soldCards: CardInstance[];
}

// ==========================================
// STAGE 2: 5-SLOT SHOWCASE (VITRINE) & DEX
// ==========================================

export interface ShowcaseSlot {
  slotIndex: number; // 0 to 4 (Exactly 5 pedestals)
  cardInstanceId: string | null;
}

export interface ShowcaseState {
  slots: ShowcaseSlot[];
  supportSlot: CardInstance | null;
}

// ==========================================
// STAGE 5: SUPPORT ALTAR & DYNAMIC BUFFS
// ==========================================

export interface SupportBuffEffect {
  yieldMultiplier?: number; // Fuutarou: 1.25, 1.50, 2.00
  harmonyBonusBoost?: number; // Fuutarou UR: amplifies Harmony from +50% to +100% (+0.50 -> +1.00)
  questThresholdReduction?: number; // Fuutarou R: 0.20 (20%)
  gradingFeeDiscount?: number; // Raiha UC: 0.15, Raiha SR: 0.30
  finishUpgradeChanceBonus?: number; // Raiha UC: +10% (0.10)
  grade10BlackLabelBonus?: number; // Raiha SR: +3% flat chance (0.03)
  dustBonus?: number; // Maruo SEC: +75% stardust (0.75)
  kioskDiscount?: number; // Maruo SEC: 25% discount (0.25)
  sisterMarketValueMultiplier?: number; // Maruo SEC: +20% market valuation (0.20)
  cooldownReductionSeconds?: number; // Takeda: cuts cooldown from 4h to 2h (cuts 7200s)
  teamIqBonus?: number; // Takeda: +15% Team IQ (0.15)
}

export interface SupportBuffConfig {
  cardDefId: string;
  supportCode: string; // e.g. "TQQ-SUP-01"
  characterId: SupportId;
  name: string;
  title: string;
  rarity: Rarity;
  description: string;
  badgeLabel: string;
  effects: SupportBuffEffect;
}

export interface ResolvedSupportBuff {
  cardDefId: string;
  supportCode: string;
  characterId: SupportId;
  name: string;
  title: string;
  rarity: Rarity;
  isGradeScaled: boolean; // true if Grade 9, 10, or Black Label (+20% numeric boost)
  gradeScaleMultiplier: number; // 1.20 if graded 9/10, else 1.0
  badgeLabel: string;
  description: string;
  effects: Required<SupportBuffEffect>;
}

export interface ShowcaseSynergyReport {
  quintupletHarmony: boolean; // Ichika, Nino, Miku, Yotsuba, Itsuki all slotted (+50%, or amplified by Fuutarou UR)
  monoWaifu: boolean; // 5 copies of the same sister (+30%)
  monoWaifuSisterId: SisterId | null;
  vaultExcellence: boolean; // All 5 cards are Slabs with Grade >= 9 (+100%)
  baseSynergiesMultiplier: number; // Base synergy multiplier from 5 pedestals (1.0 + harmony + mono + excellence)
  supportMultiplier: number; // Multiplier from slotted Support card (e.g. 1.25x, 1.50x, 2.00x, 2.40x)
  synergyMultiplier: number; // Combined multiplier (baseSynergiesMultiplier * supportMultiplier)
  totalMarketValue: number; // Total market valuation in Yen across slotted cards (including Maruo boost if active)
  baseFloorPerMinute: number; // Guaranteed base floor: 60 Yen/min (1 Yen/sec) per slotted card
  marketBonusPerMinute: number; // Sum of (Market Value * 0.0002)
  effectiveYieldPerMinute: number; // (baseFloorPerMinute + marketBonusPerMinute) * synergyMultiplier
  effectiveYieldPerSecond: number; // effectiveYieldPerMinute / 60
  slottedCount: number; // 0 to 5
  activeSupportBuff: ResolvedSupportBuff | null;
}

export interface CardDexEntry {
  cardDefId: string;
  cardNumber: string; // e.g. "TQQ-001"
  characterId: CharacterId;
  characterRole: CharacterRole;
  rarity: Rarity;
  discovered: boolean;
  discoveredAt?: number;
  highestFinish?: Finish;
  bestGrade?: GradeResult;
  timesObtained: number;
}

