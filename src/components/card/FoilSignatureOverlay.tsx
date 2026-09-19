'use client';

import React, { useId, useMemo } from 'react';
import type { CharacterId } from '../../types/card';

export interface FoilSignatureOverlayProps {
  /** Target character ID to determine voice actress signature and motif */
  characterId: CharacterId;
  /** Optional custom character name display */
  characterName?: string;
  /** Optional CSS class name */
  className?: string;
  /** Whether to render the specular light shimmer sweep */
  showSpecularShimmer?: boolean;
  /** Whether to render the traditional Japanese red Hanko seal */
  showHankoSeal?: boolean;
  /** Optional container style overrides */
  style?: React.CSSProperties;
}

export interface SignatureData {
  actressRomanji: string;
  actressKanji: string;
  characterRomanji: string;
  accentColor: string;
  motifSymbol: string;
  motifName: string;
  hankoTop: string;
  hankoBottom: string;
  signaturePath: string;
  flourishPath: string;
}

export const SIGNATURE_REGISTRY: Record<string, SignatureData> = {
  ichika: {
    actressRomanji: 'Kana Hanazawa',
    actressKanji: '花澤 香菜',
    characterRomanji: 'Ichika Nakano',
    accentColor: '#F59E0B',
    motifSymbol: '💛',
    motifName: 'Sunflower Heart',
    hankoTop: '花澤',
    hankoBottom: '香菜',
    // Flowing elegant cursive "Kana Hanazawa" with playful looped "K" and heart flourish
    signaturePath:
      'M 20 62 C 24 38 32 18 42 16 C 46 15 48 20 46 28 C 42 44 32 76 28 88 C 26 94 30 92 38 82 C 48 68 62 48 76 46 C 84 45 80 58 74 68 C 68 76 60 84 56 86 C 54 87 64 82 76 72 C 86 64 96 52 108 50 C 114 49 116 54 112 62 C 106 74 94 88 110 82 C 122 78 136 62 148 54 C 158 48 168 56 162 68 C 156 78 144 86 160 82 C 174 78 190 60 204 54 C 214 50 220 58 214 68 C 206 80 224 74 238 66',
    flourishPath:
      'M 238 66 C 248 56 262 50 270 58 C 276 64 272 74 262 82 C 252 90 240 98 232 106 C 230 108 234 104 242 96 C 258 80 278 72 284 80 C 290 88 280 98 266 104 C 252 110 236 108 226 102 C 218 96 216 88 222 84 C 228 80 238 84 238 66 Z',
  },
  nino: {
    actressRomanji: 'Ayana Taketatsu',
    actressKanji: '竹達 彩奈',
    characterRomanji: 'Nino Nakano',
    accentColor: '#EC4899',
    motifSymbol: '🦋',
    motifName: 'Butterfly Ribbon',
    hankoTop: '竹達',
    hankoBottom: '彩奈',
    // Stylish and dramatic "Ayana Taketatsu" with butterfly wing ascenders and ribbon loops
    signaturePath:
      'M 22 78 C 28 50 44 22 56 18 C 64 16 66 26 60 40 C 52 60 38 86 34 94 C 32 98 42 92 54 78 C 66 64 80 44 94 42 C 102 41 102 54 96 66 C 88 80 76 92 90 86 C 102 80 114 62 126 54 C 136 48 146 54 140 68 C 132 84 146 80 162 70 C 176 60 190 44 204 42 C 212 41 214 52 206 66 C 196 82 210 78 226 68 C 238 60 252 52 264 56',
    flourishPath:
      'M 58 22 C 72 10 92 12 96 26 C 98 34 90 44 78 48 C 68 52 56 46 58 36 C 60 28 72 32 80 30 M 264 56 C 274 44 290 38 296 46 C 300 52 292 62 280 68 C 268 74 256 82 266 90 C 274 96 288 92 294 82',
  },
  miku: {
    actressRomanji: 'Miku Itō',
    actressKanji: '伊藤 美来',
    characterRomanji: 'Miku Nakano',
    accentColor: '#06B6D4',
    motifSymbol: '🎧',
    motifName: 'Studio Headphone & Treble',
    hankoTop: '伊藤',
    hankoBottom: '美来',
    // Gentle rounded "Miku Ito" with headphones arch and melodic swirl
    signaturePath:
      'M 24 82 C 28 58 38 32 48 24 C 54 20 58 28 54 42 C 48 64 36 90 48 88 C 60 86 74 62 86 52 C 94 46 98 54 92 66 C 84 84 96 82 110 72 C 122 62 134 46 146 44 C 152 43 154 52 148 64 C 140 82 152 80 168 70 C 182 60 196 48 210 46 C 218 45 220 56 212 68 C 202 84 220 78 238 68 C 250 60 264 54 274 58',
    flourishPath:
      'M 48 24 C 64 6 120 6 142 22 C 152 30 156 42 148 50 C 142 56 132 54 134 44 C 136 34 146 36 150 32 M 274 58 C 286 46 298 52 296 66 C 294 76 282 86 270 94 C 260 102 248 108 238 102 C 230 96 236 86 248 84 C 258 82 272 90 286 92',
  },
  yotsuba: {
    actressRomanji: 'Ayane Sakura',
    actressKanji: '佐倉 綾音',
    characterRomanji: 'Yotsuba Nakano',
    accentColor: '#10B981',
    motifSymbol: '🍀',
    motifName: 'Four-Leaf Clover',
    hankoTop: '佐倉',
    hankoBottom: '綾音',
    // Energetic cheerful "Ayane Sakura" with clover loops and dynamic upward strike
    signaturePath:
      'M 20 86 C 26 56 42 24 54 18 C 62 14 66 24 60 38 C 52 58 38 88 32 96 C 30 100 40 94 54 80 C 66 66 82 46 96 44 C 104 43 104 54 96 68 C 86 86 102 82 118 70 C 132 58 146 44 160 42 C 168 41 170 52 162 66 C 152 84 168 80 186 68 C 200 58 216 46 230 46 C 238 46 240 56 232 70 C 224 84 242 78 260 68',
    flourishPath:
      'M 260 68 C 272 56 288 54 292 64 C 296 72 288 82 276 86 C 288 86 296 94 294 104 C 292 112 280 116 268 110 C 264 118 254 120 248 114 C 242 108 244 98 252 92 C 242 90 238 80 244 72 C 250 66 260 70 262 76 Z',
  },
  itsuki: {
    actressRomanji: 'Inori Minase',
    actressKanji: '水瀬 いのり',
    characterRomanji: 'Itsuki Nakano',
    accentColor: '#EF4444',
    motifSymbol: '⭐',
    motifName: 'Celestial Starlight',
    hankoTop: '水瀬',
    hankoBottom: 'いのり',
    // Precise starry "Inori Minase" with double starlight flourishes and sweeping ribbon
    signaturePath:
      'M 24 76 C 28 48 40 22 52 16 C 58 13 62 22 58 36 C 50 56 38 84 34 92 C 32 96 42 90 56 76 C 68 62 84 42 98 40 C 106 39 106 50 98 64 C 88 82 104 78 120 68 C 134 58 148 44 162 42 C 170 41 172 52 164 66 C 154 84 170 80 188 68 C 202 58 218 46 232 46 C 240 46 242 56 234 70 C 224 84 244 78 262 66',
    flourishPath:
      'M 262 66 L 272 52 L 276 68 L 292 68 L 278 78 L 284 94 L 270 82 L 256 92 L 262 76 L 250 66 Z M 52 16 L 56 8 L 60 16 L 68 18 L 62 24 L 64 32 L 56 26 L 48 30 L 50 22 L 44 18 Z',
  },
  fuutarou: {
    actressRomanji: 'Yoshitsugu Matsuoka',
    actressKanji: '松岡 禎丞',
    characterRomanji: 'Fuutarou Uesugi',
    accentColor: '#64748B',
    motifSymbol: '📖',
    motifName: 'Study Quill & Thesis',
    hankoTop: '松岡',
    hankoBottom: '禎丞',
    signaturePath:
      'M 22 74 C 28 48 46 24 58 18 C 66 14 68 26 62 42 C 54 62 40 88 52 86 C 66 84 82 60 96 48 C 104 42 108 52 102 66 C 92 84 110 80 126 68 C 140 58 156 46 170 44 C 178 43 180 54 172 68 C 162 86 182 80 202 68 C 218 58 236 48 252 50',
    flourishPath: 'M 252 50 C 266 40 284 46 280 62 C 276 74 260 84 246 88 C 234 92 242 98 256 94',
  },
  raiha: {
    actressRomanji: 'Natsumi Takamori',
    actressKanji: '高森 奈津美',
    characterRomanji: 'Raiha Uesugi',
    accentColor: '#FBBF24',
    motifSymbol: '✨',
    motifName: 'Sparkling Amulet',
    hankoTop: '高森',
    hankoBottom: '奈津美',
    signaturePath:
      'M 24 72 C 30 46 44 26 56 20 C 64 16 66 26 60 40 C 52 60 38 86 50 84 C 64 82 78 60 92 50 C 100 44 104 54 98 68 C 88 84 106 80 122 70 C 136 60 152 48 166 46 C 174 45 176 56 168 70 C 158 86 178 82 198 70 C 214 60 232 50 248 52',
    flourishPath: 'M 248 52 C 262 42 278 48 274 64 C 270 76 254 86 242 90',
  },
  maruo: {
    actressRomanji: 'Takaya Kuroda',
    actressKanji: '黒田 崇矢',
    characterRomanji: 'Maruo Nakano',
    accentColor: '#475569',
    motifSymbol: '👓',
    motifName: 'Patriarch Seal',
    hankoTop: '黒田',
    hankoBottom: '崇矢',
    signaturePath:
      'M 26 76 C 32 44 48 22 62 16 C 70 12 72 24 66 40 C 56 64 42 90 56 88 C 70 86 86 62 100 50 C 108 44 112 54 106 68 C 96 86 116 82 134 70 C 150 60 168 46 182 44 C 190 43 192 54 184 70 C 174 88 196 82 218 70 C 234 60 252 50 268 52',
    flourishPath: 'M 268 52 C 282 42 298 48 294 64 C 290 76 274 86 262 90',
  },
  takeda: {
    actressRomanji: 'Soma Saito',
    actressKanji: '斉藤 壮馬',
    characterRomanji: 'Yusuke Takeda',
    accentColor: '#8B5CF6',
    motifSymbol: '🚀',
    motifName: 'Academic Star',
    hankoTop: '斉藤',
    hankoBottom: '壮馬',
    signaturePath:
      'M 24 72 C 30 46 44 26 56 20 C 64 16 66 26 60 40 C 52 60 38 86 50 84 C 64 82 78 60 92 50 C 100 44 104 54 98 68 C 88 84 106 80 122 70 C 136 60 152 48 166 46 C 174 45 176 56 168 70 C 158 86 178 82 198 70 C 214 60 232 50 248 52',
    flourishPath: 'M 248 52 C 262 42 278 48 274 64 C 270 76 254 86 242 90',
  },
  isanari: {
    actressRomanji: 'Satoshi Hino',
    actressKanji: '日野 聡',
    characterRomanji: 'Isanari Uesugi',
    accentColor: '#D97706',
    motifSymbol: '🏍️',
    motifName: 'Speed Falcon',
    hankoTop: '日野',
    hankoBottom: '聡',
    signaturePath:
      'M 24 72 C 30 46 44 26 56 20 C 64 16 66 26 60 40 C 52 60 38 86 50 84 C 64 82 78 60 92 50 C 100 44 104 54 98 68 C 88 84 106 80 122 70 C 136 60 152 48 166 46 C 174 45 176 56 168 70 C 158 86 178 82 198 70 C 214 60 232 50 248 52',
    flourishPath: 'M 248 52 C 262 42 278 48 274 64 C 270 76 254 86 242 90',
  },
};

/**
 * FoilSignatureOverlay - Vector Hot-Stamped Gold Foil VA Autograph Component
 * Replicates authentic Bushiroad Weiss Schwarz SP / SSP voice actress hot-stamp signatures.
 * Stamped in high-luster metallic gold leaf with Japanese Hanko seal and dynamic specular shimmer.
 */
export const FoilSignatureOverlay: React.FC<FoilSignatureOverlayProps> = ({
  characterId,
  characterName,
  className = '',
  showSpecularShimmer = true,
  showHankoSeal = true,
  style,
}) => {
  const uniqueId = useId().replace(/:/g, '_');
  const goldGradId = `gold_foil_leaf_${uniqueId}`;
  const goldGleamGradId = `gold_foil_gleam_${uniqueId}`;
  const foilShadowFilterId = `gold_foil_shadow_${uniqueId}`;

  const sigData = useMemo(() => {
    return SIGNATURE_REGISTRY[characterId] ?? SIGNATURE_REGISTRY.miku;
  }, [characterId]);

  return (
    <div
      className={`foil-signature-overlay absolute inset-x-3 bottom-10 z-35 pointer-events-none select-none ${className}`}
      style={style}
    >
      <div className="relative w-full flex flex-col items-end">
        {/* SVG Hot-Stamp Vector Canvas */}
        <svg
          viewBox="0 0 320 130"
          className="w-full h-auto overflow-visible"
          style={{
            filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.85)) drop-shadow(0 0 8px ${sigData.accentColor}33)`,
          }}
          aria-hidden="true"
        >
          <defs>
            {/* Authentic Metallic Gold Leaf Gradient */}
            <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bf953f" />
              <stop offset="25%" stopColor="#fcf6ba" />
              <stop offset="50%" stopColor="#b38728" />
              <stop offset="75%" stopColor="#fbf5b7" />
              <stop offset="100%" stopColor="#aa771c" />
            </linearGradient>

            {/* Dynamic Specular Shimmer Gradient */}
            <linearGradient id={goldGleamGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#fffae0" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Crisp Emboss Shadow Filter */}
            <filter id={foilShadowFilterId} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor="#000000" floodOpacity="0.85" />
            </filter>
          </defs>

          {/* Micro-engraved Security Filigree Background Ring */}
          <g opacity="0.45">
            <circle
              cx="275"
              cy="75"
              r="22"
              fill="none"
              stroke={`url(#${goldGradId})`}
              strokeWidth="0.75"
              strokeDasharray="2 3"
            />
            <circle
              cx="275"
              cy="75"
              r="18"
              fill="none"
              stroke={`url(#${goldGradId})`}
              strokeWidth="0.5"
            />
          </g>

          {/* Autograph Cursive Main Strokes */}
          <path
            d={sigData.signaturePath}
            fill="none"
            stroke={`url(#${goldGradId})`}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${foilShadowFilterId})`}
          />

          {/* Calligraphic Flourish & Motif */}
          <path
            d={sigData.flourishPath}
            fill={`url(#${goldGradId})`}
            fillOpacity="0.85"
            stroke={`url(#${goldGradId})`}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Secondary Shimmer Highlights Overlay */}
          {showSpecularShimmer && (
            <path
              d={sigData.signaturePath}
              fill="none"
              stroke={`url(#${goldGleamGradId})`}
              strokeWidth="2.0"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          )}

          {/* Micro Gold Hot-Stamped Inscription */}
          <text
            x="295"
            y="118"
            textAnchor="end"
            fontSize="7"
            fontFamily="monospace"
            letterSpacing="1.2"
            fontWeight="900"
            fill={`url(#${goldGradId})`}
            opacity="0.9"
          >
            ★ WEISS SCHWARZ SPECIAL SIGNED • {sigData.actressRomanji.toUpperCase()} ★
          </text>
        </svg>

        {/* Traditional Japanese Hanko Seal Box (Square Vermilion/Gold Inkan) */}
        {showHankoSeal && (
          <div className="absolute right-1 -top-3 flex items-center gap-1.5 pointer-events-none select-none">
            <div
              className="relative w-8 h-8 rounded border flex flex-col items-center justify-center p-0.5 shadow-lg backdrop-blur-xs"
              style={{
                borderColor: '#bf953f',
                background: 'linear-gradient(135deg, rgba(191,149,63,0.2) 0%, rgba(170,119,28,0.35) 100%)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.8), inset 0 0 4px rgba(252,246,186,0.3)',
              }}
            >
              <div
                className="w-full h-full border border-[#bf953f]/80 flex flex-col items-center justify-center text-center font-serif leading-none"
                style={{
                  color: '#fcf6ba',
                  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                }}
              >
                <span className="text-[7.5px] font-black tracking-widest">{sigData.hankoTop}</span>
                <span className="text-[7.5px] font-black tracking-widest mt-0.5">{sigData.hankoBottom}</span>
              </div>
            </div>

            {/* Voice Actress Name Pill Badge */}
            <div
              className="px-2 py-0.5 rounded-full border text-[8.5px] font-bold tracking-wider uppercase font-mono shadow-md"
              style={{
                color: '#fcf6ba',
                borderColor: '#bf953f',
                background: 'linear-gradient(135deg, rgba(20,20,28,0.9) 0%, rgba(10,10,14,0.95) 100%)',
                boxShadow: `0 0 10px ${sigData.accentColor}44`,
              }}
            >
              <span>{sigData.motifSymbol}</span>
              <span className="ml-1 text-[9px] font-black">{sigData.actressKanji}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoilSignatureOverlay;
