// TQQ card system: a Pokémon-style structure (HP, moves paid with Hearts, weakness, retreat, stages)
// themed around the Quintuplets. Rarity and finish are independent: rarity belongs to the card design,
// finish (holo, gold, cosmos...) belongs to an individual printed copy.
//
// This file holds the fixed vocabulary (types of Hearts, rarities, stages, characters). The shape of a card
// and of its effects, and the checks that run on the card data files, are in schema.ts.

export type { Ability, ArtCrop, ArtRef, Card, CardId, CharacterCard, Effect, LocalizedName, Move, SupporterCard } from './schema';

/** The six Heart types. Each sister owns one; Study is the neutral type of the supporting cast. */
export const AFFINITIES = ['heart', 'butterfly', 'melody', 'clover', 'star', 'study'] as const;
export type Affinity = (typeof AFFINITIES)[number];

/** The five types a sister can have (everything except the neutral Study). */
export const SISTER_AFFINITIES = ['heart', 'butterfly', 'melody', 'clover', 'star'] as const;

export const SISTERS = ['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'] as const;
export type SisterId = (typeof SISTERS)[number];

export const SUPPORTING_CAST = ['fuutarou', 'raiha', 'isanari', 'maruo', 'yusuke'] as const;
export type SupportingId = (typeof SUPPORTING_CAST)[number];

export const CHARACTER_IDS = [...SISTERS, ...SUPPORTING_CAST] as const;
export type CharacterId = SisterId | SupportingId;

export type RarityShape = 'circle' | 'diamond' | 'star' | 'sparkle';

interface RarityDefinition {
  readonly id: string;
  readonly label: string;
  readonly tier: number;
  readonly symbol: string;
  readonly mark: { readonly shape: RarityShape; readonly count: number };
}

export const RARITY_IDS = ['C', 'U', 'R', 'RR', 'AR', 'SAR', 'UR'] as const;

/**
 * Seven tiers, lowest first. `tier` doubles as the pull-rate bucket for the pack engine later.
 * `mark` is drawn as vector shapes on the card face; `symbol` is the text form for lists and logs.
 */
export const RARITIES = [
  { id: 'C', label: 'Alltag', tier: 1, symbol: '●', mark: { shape: 'circle', count: 1 } },
  { id: 'U', label: 'Besonders', tier: 2, symbol: '◆', mark: { shape: 'diamond', count: 1 } },
  { id: 'R', label: 'Selten', tier: 3, symbol: '★', mark: { shape: 'star', count: 1 } },
  { id: 'RR', label: 'Superselten', tier: 4, symbol: '★★', mark: { shape: 'star', count: 2 } },
  { id: 'AR', label: 'Kunstwerk', tier: 5, symbol: '✦', mark: { shape: 'sparkle', count: 1 } },
  { id: 'SAR', label: 'Meisterwerk', tier: 6, symbol: '✦✦', mark: { shape: 'sparkle', count: 2 } },
  { id: 'UR', label: 'Legende', tier: 7, symbol: '✦✦✦', mark: { shape: 'sparkle', count: 3 } },
] as const satisfies readonly RarityDefinition[];
export type Rarity = (typeof RARITIES)[number]['id'];

export const STAGE_IDS = ['basic', 'close', 'bride', 'event'] as const;

/**
 * Bond stages, the equivalent of Basic → Stage 1 → Stage 2. `event` is the limited Halloween kind: it is played
 * straight to the Bench like a Basic but nothing evolves from or into it.
 */
export const STAGES = [
  { id: 'basic', label: 'Keim', ja: 'たね' },
  { id: 'close', label: 'Nähe', ja: '親密' },
  { id: 'bride', label: 'Braut', ja: '花嫁' },
  { id: 'event', label: 'Fest', ja: '限定' },
] as const;
export type Stage = (typeof STAGES)[number]['id'];
