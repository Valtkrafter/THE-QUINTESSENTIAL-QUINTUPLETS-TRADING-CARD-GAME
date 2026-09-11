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

