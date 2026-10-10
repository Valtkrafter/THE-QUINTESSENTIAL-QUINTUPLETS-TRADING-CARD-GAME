// TQQ card system: a Pokémon-style structure (HP, moves paid with Hearts, weakness, retreat, stages)
// themed around the Quintuplets. Rarity and finish are independent: rarity belongs to the card design,
// finish (holo, gold, cosmos...) belongs to an individual printed copy.

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type CardId = Brand<string, 'CardId'>;
export type ArtKey = Brand<string, 'ArtKey'>;

export function cardId(value: string): CardId {
  return value as CardId;
}

export function artKey(character: CharacterId, index: number): ArtKey {
  return `${character}/${index}` as ArtKey;
}

/** The six Heart types. Each sister owns one; Study is the neutral type of the supporting cast. */
export const AFFINITIES = ['heart', 'butterfly', 'melody', 'clover', 'star', 'study'] as const;
export type Affinity = (typeof AFFINITIES)[number];

export const SISTERS = ['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'] as const;
export type SisterId = (typeof SISTERS)[number];

export const SUPPORTING_CAST = ['fuutarou', 'raiha', 'isanari', 'maruo', 'yusuke'] as const;
export type SupportingId = (typeof SUPPORTING_CAST)[number];

export type CharacterId = SisterId | SupportingId;

export type RarityShape = 'circle' | 'diamond' | 'star' | 'sparkle';

interface RarityDefinition {
  readonly id: string;
  readonly label: string;
  readonly tier: number;
  readonly symbol: string;
  readonly mark: { readonly shape: RarityShape; readonly count: number };
}

/**
 * Seven tiers, lowest first. `tier` doubles as the pull-rate bucket for the pack engine later.
 * `mark` is drawn as vector shapes on the card face; `symbol` is the text form for lists and logs.
 */
export const RARITIES = [
  { id: 'C', label: 'Common', tier: 1, symbol: '●', mark: { shape: 'circle', count: 1 } },
  { id: 'U', label: 'Uncommon', tier: 2, symbol: '◆', mark: { shape: 'diamond', count: 1 } },
  { id: 'R', label: 'Rare', tier: 3, symbol: '★', mark: { shape: 'star', count: 1 } },
  { id: 'RR', label: 'Double Rare', tier: 4, symbol: '★★', mark: { shape: 'star', count: 2 } },
  { id: 'AR', label: 'Art Rare', tier: 5, symbol: '✦', mark: { shape: 'sparkle', count: 1 } },
  { id: 'SAR', label: 'Special Art Rare', tier: 6, symbol: '✦✦', mark: { shape: 'sparkle', count: 2 } },
  { id: 'UR', label: 'Ultra Rare', tier: 7, symbol: '✦✦✦', mark: { shape: 'sparkle', count: 3 } },
] as const satisfies readonly RarityDefinition[];
export type Rarity = (typeof RARITIES)[number]['id'];

/** Bond stages, the equivalent of Basic → Stage 1 → Stage 2. */
export const STAGES = [
  { id: 'basic', label: 'Basic', ja: 'たね' },
  { id: 'close', label: 'Close', ja: '親密' },
  { id: 'bride', label: 'Bride', ja: '花嫁' },
] as const;
export type Stage = (typeof STAGES)[number]['id'];

/**
 * Art framing. `zoom` 1 fills the card (cover); below 1 shows more of the image, with a blurred copy
 * of the art filling the rest. `x`/`y` pick the visible part: 0 = left/top edge, 1 = right/bottom edge.
 */
export interface ArtCrop {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export const DEFAULT_CROP: ArtCrop = { x: 0.5, y: 0, zoom: 1 };

export interface LocalizedName {
  readonly en: string;
  readonly ja: string;
}

export interface Move {
  readonly name: string;
  /** Hearts that must be attached to use the move. `study` can be paid with any Heart. */
  readonly cost: readonly Affinity[];
  readonly damage: number | null;
  /** `+` = more damage under a condition, `×` = damage per count. */
  readonly damageSuffix?: '+' | '×';
  readonly text?: string;
}

/** Passive or once-per-turn effect printed above the moves. */
export interface Ability {
  readonly name: string;
  readonly text: string;
}

interface CardBase {
  readonly id: CardId;
  readonly set: string;
  readonly number: number;
  readonly rarity: Rarity;
  readonly name: LocalizedName;
  /** Card-specific subtitle, e.g. "Summer Fireworks". */
  readonly title: string;
  readonly art: ArtKey;
  readonly illustrator: string;
  /** Carries a gold-foil signature (stylised, invented). */
  readonly signed: boolean;
  /** How the art sits on the card. */
  readonly crop: ArtCrop;
}

export interface CharacterCard extends CardBase {
  readonly kind: 'character';
  readonly character: SisterId;
  readonly stage: Stage;
  /** Prime cards are stronger but give up two Memories when knocked out (the "ex" rule). */
  readonly prime: boolean;
  readonly hp: number;
  readonly affinity: Affinity;
  readonly ability?: Ability;
  readonly moves: readonly Move[];
  readonly weakness: Affinity | null;
  readonly resistance: Affinity | null;
  readonly retreat: number;
}

/** One Supporter per turn. */
export interface SupporterCard extends CardBase {
  readonly kind: 'supporter';
  readonly character: SupportingId;
  readonly effect: string;
}

export type Card = CharacterCard | SupporterCard;
