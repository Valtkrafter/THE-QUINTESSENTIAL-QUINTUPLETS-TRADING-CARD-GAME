/**
 * TQQ Vault - 3D Pack Opening Ceremony Type Definitions
 * Architecture & Data Contracts for Native AAA 3D Pack Opening Engine
 */

import type { CardInstance } from './card';

export type PackOpeningPhase =
  | 'IDLE'               // Modal unopened or reset
  | 'INSPECTING_PACK'   // 3D pack floating in space; free 360° rotation
  | 'TEARING_CRIMP'     // Pointer/touch interacting with top foil perforation
  | 'EXTRACTING_CARDS'  // Severed foil drops; 5-card stack slides out
  | 'PEELING_REVEAL'    // Cards face-down on velvet; swipe-to-reveal sequence
  | 'CEREMONY_SUMMARY'; // All 5 cards revealed in fan/grid layout

export type CardFinishTier =
  | 'raw'
  | 'holo'
  | 'sparkle'
  | 'rainbow'
  | 'gold_etched'
  | 'signed_sp';

export interface CardShaderUniforms {
  tiltX: number;            // Normalized horizontal tilt: -1.0 to +1.0
  tiltY: number;            // Normalized vertical tilt: -1.0 to +1.0
  glareOpacity: number;     // Dynamic sheen intensity: 0.0 to 1.0
  specularX: number;        // Hotspot position percentage: 0 to 100
  specularY: number;        // Hotspot position percentage: 0 to 100
  holographicAngle: number; // Angular refraction in degrees: 0° to 360°
}

export type SuspenseTier = 'standard' | 'rare' | 'ultra' | 'god';

export interface EdgeGlowProfile {
  colorHex: string;
  secondaryHex: string;
  blurRadiusPx: number;
  spreadPx: number;
  pulseDurationSec: number;
  particleCount: number;
  suspenseTier: SuspenseTier;
}

export interface PackOpeningSession {
  packId: string;
  packName: string;
  cards: CardInstance[];
  revealedIndices: number[];
  currentCardIndex: number;
  isGodPack: boolean;
  highestRarityFound: string;
  highestFinishFound: CardFinishTier;
}
