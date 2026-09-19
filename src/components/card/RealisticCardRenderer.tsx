'use client';

import React, { useRef, useState, useMemo, useEffect, useId } from 'react';
import { motion, MotionStyle } from 'framer-motion';
import type {
  CardDefinition,
  CardInstance,
  CharacterId,
  Finish,
  GradeResult,
  Rarity,
} from '../../types/card';
import type { CardFinishTier } from '../../types/packCeremony';
import { CARD_MAP, getCardDef } from '../../config/cardsData';
import { calculateCardMarketValue } from '../../config/economy';
import { normalizeTqqCardPath } from '../../utils/tqqAssetResolver';
import { useCardFoilTilt } from '../../hooks/useCardFoilTilt';
import { FoilSignatureOverlay } from './FoilSignatureOverlay';
import {
  CHARACTER_THEMES,
  CHARACTER_INITIALS,
  RARITY_BADGES,
  FINISH_LABELS,
  getAuthoritativeGradeBadgeStyle,
} from './CardRenderer';

export type RealisticFinish = Finish | CardFinishTier;

export interface RealisticCardRendererProps {
  /** Card instance or partial card definition */
  card: CardInstance | (CardDefinition & Partial<CardInstance>);
  /** Finish override (supports both 'signed' and 'signed_sp', 'gold_etched', 'rainbow', etc.) */
  finishOverride?: RealisticFinish;
  /** Whether cursor/touch interactions and 3D tilt are active */
  interactive?: boolean;
  /** Size preset: sm, md, lg, full, or custom */
  size?: 'sm' | 'md' | 'lg' | 'full' | 'custom';
  /** Custom CSS classes on the perspective wrapper */
  className?: string;
  /** Click event callback */
  onClick?: () => void;
  /** Whether to render estimated yen market valuation in footer */
  showMarketValue?: boolean;
  /** Disables 3D tilt and shader uniforms */
  disableTilt?: boolean;
  /** Enables DeviceOrientation gyroscope on mobile */
  enableGyro?: boolean;
  /** Suppresses bulky footer for showcase vitrine presentation */
  showcaseMode?: boolean;
  /** Compact thumbnail mode for dense collection views */
  thumbnail?: boolean;
  /**
   * Layer inspection filter: array of active layer numbers (0 to 4).
   * If omitted, all applicable layers for the card's finish are rendered.
   */
  activeLayers?: number[];
}

/**
 * RealisticCardRenderer - 5-Layer Composite Weiss Schwarz SP & Pokémon Foil Engine
 *
 * Implements authentic physical collectible card aesthetics:
 * - Layer 0: Dark premium 350gsm cardstock core with micro paper tooth texture.
 * - Layer 1: Full-bleed high-res illustration with authentic collectible frame.
 * - Layer 2: Micro-etched relief map with angle-directional procedural SVG specular lighting.
 * - Layer 3: Prismatic rainbow holographic refraction with conic angle gradients.
 * - Layer 4: Hot-stamped gold foil borders, crests, and voice actress signatures.
 */
export const RealisticCardRenderer: React.FC<RealisticCardRendererProps> = ({
  card,
  finishOverride,
  interactive = true,
  size = 'md',
  className = '',
  onClick,
  showMarketValue = true,
  disableTilt = false,
  enableGyro = true,
  showcaseMode = false,
  thumbnail = false,
  activeLayers,
}) => {
  const uniqueId = useId().replace(/:/g, '_');
  const paperToothNoiseId = `paper_tooth_noise_${uniqueId}`;
  const reliefFilterId = `micro_relief_filter_${uniqueId}`;
  const goldFoilGradId = `gold_foil_grad_${uniqueId}`;

  const isThumbnail = Boolean(thumbnail);
  const effectiveInteractive = interactive && !isThumbnail;
  const effectiveDisableTilt = disableTilt || isThumbnail;

  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [hasImageError, setHasImageError] = useState(false);

  // Safely resolve the card definition
  const cardDefId =
    ('cardDefId' in card ? card.cardDefId : undefined) ??
    ('id' in card ? card.id : undefined);
  const cardDef = (cardDefId ? getCardDef(cardDefId) : undefined) ?? CARD_MAP['miku_c_01'];

  // Resolve metadata
  const characterId: CharacterId = card.characterId ?? cardDef?.characterId ?? 'miku';
  const rarity: Rarity = card.rarity ?? cardDef?.rarity ?? 'C';
  const rawFinish: RealisticFinish = finishOverride ?? card.finish ?? 'raw';

  // Normalize finish flags: handle both 'signed' and 'signed_sp'
  const isSigned = rawFinish === 'signed' || rawFinish === 'signed_sp';
  const isGoldEtched = rawFinish === 'gold_etched';
  const isRainbow = rawFinish === 'rainbow';
  const isSparkle = rawFinish === 'sparkle';
  const isHolo = rawFinish === 'holo';
  const isRaw = rawFinish === 'raw';

  // Effective finish tier for badges & labels
  const finishForBadge: Finish = isSigned ? 'signed' : (rawFinish as Finish);

  const theme = CHARACTER_THEMES[characterId] ?? CHARACTER_THEMES.miku;
  const rarityBadge = RARITY_BADGES[rarity] ?? RARITY_BADGES.C;
  const activeGrade: GradeResult | undefined = 'grade' in card ? card.grade : undefined;
  const gradeBadge = activeGrade ? getAuthoritativeGradeBadgeStyle(activeGrade) : null;
  const marketValue = calculateCardMarketValue(
    'finish' in card
      ? { ...(card as CardInstance), finish: finishForBadge }
      : { ...cardDef, finish: finishForBadge, obtainedAt: 0, cardDefId: cardDef.id }
  );

  const cardName: string = card.name ?? cardDef?.name ?? theme.name;
  const cardTitle: string = card.title ?? cardDef?.title ?? cardDef?.name ?? 'Collector Card';
  const cardLoreQuote: string = cardDef?.loreQuote ?? '';
  const cardNumber: string = card.cardNumber ?? cardDef?.cardNumber ?? 'TQQ-000';
  const characterRole: string = cardDef?.characterRole ?? 'sister';

  // Resolve artwork image path
  const rawImageUrl: string | undefined = card.imageUrl ?? cardDef?.imageUrl;

  const resolvedImageUrl = useMemo(() => {
    if (!rawImageUrl) return '';
    const normalized = normalizeTqqCardPath(rawImageUrl as string, characterId);
    let pathStr = String(normalized).trim();
    if (!pathStr.startsWith('/') && !pathStr.startsWith('http')) {
      pathStr = '/' + pathStr;
    }
    try {
      return decodeURI(pathStr);
    } catch {
      return pathStr;
    }
  }, [rawImageUrl, characterId]);

  const [currentSrc, setCurrentSrc] = useState<string>(() => resolvedImageUrl);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setCurrentSrc(resolvedImageUrl);
    setTriedFallback(false);
    setHasImageError(false);
  }, [resolvedImageUrl]);

  const handleImageError = () => {
    const canonicalDefUrl = cardDef?.imageUrl
      ? normalizeTqqCardPath(cardDef.imageUrl, cardDef.characterId)
      : '';
    if (!triedFallback && canonicalDefUrl && canonicalDefUrl !== currentSrc) {
      setTriedFallback(true);
      setCurrentSrc(canonicalDefUrl);
      return;
    }
    setHasImageError(true);
  };

  // Real-time Tilt & Holographic Uniforms Engine
  const {
    uniforms,
    tiltStyle,
    containerProps,
    isHovered,
  } = useCardFoilTilt({
    maxRotation: 16,
    perspective: 1100,
    disabled: !effectiveInteractive || effectiveDisableTilt,
    enableGyro: enableGyro && !effectiveDisableTilt,
  });

  // Layer inspection helpers: evaluate whether a given layer should render
  const isLayerActive = (layerIndex: number): boolean => {
    if (activeLayers !== undefined) {
      return activeLayers.includes(layerIndex);
    }
    switch (layerIndex) {
      case 0:
        return true; // Layer 0: Substrate base
      case 1:
        return true; // Layer 1: Base artwork & frame
      case 2:
        return isRainbow || isGoldEtched || isSigned; // Layer 2: Micro-etched relief
      case 3:
        return isRainbow || isGoldEtched || isSigned; // Layer 3: Prismatic rainbow
      case 4:
        return isGoldEtched || isSigned; // Layer 4: Hot-stamped gold foil & signature
      default:
        return true;
    }
  };

  // Responsive size presets
  const sizeClasses = isThumbnail || size === 'full' || size === 'custom'
    ? 'w-full h-full max-h-full max-w-full'
    : {
        sm: 'w-[200px] max-w-full',
        md: 'w-[320px] sm:w-[360px] max-w-full',
        lg: 'w-[380px] max-w-full',
        full: 'w-full h-full max-h-full max-w-full',
        custom: 'w-full h-full max-h-full max-w-full',
      }[size];

  const shouldHideFooter = showcaseMode || isThumbnail;

  return (
    <div
      className={`card-perspective-wrapper ${
        size === 'full' || size === 'custom' || isThumbnail
          ? 'w-full h-full flex items-center justify-center'
          : 'inline-block'
      } select-none relative ${isThumbnail ? '' : "before:absolute before:-inset-4 before:content-['']"} ${
        effectiveInteractive ? 'cursor-pointer' : 'pointer-events-none'
      } ${className}`}
      onClick={onClick}
      {...(effectiveDisableTilt || !effectiveInteractive ? {} : containerProps)}
    >
      <motion.div
        ref={cardRef}
        style={{
          ...(effectiveDisableTilt || !effectiveInteractive ? {} : tiltStyle),
          boxShadow: isThumbnail
            ? 'none'
            : isHovered && !effectiveDisableTilt && effectiveInteractive
            ? `0 24px 48px -10px rgba(0, 0, 0, 0.85), 0 0 32px ${theme.glowColor}, 0 0 1px rgba(255,255,255,0.2)`
            : '0 12px 28px -6px rgba(0, 0, 0, 0.65), 0 0 12px rgba(0, 0, 0, 0.45)',
        } as MotionStyle}
        className={`realistic-card-root relative ${sizeClasses} aspect-[63/88] rounded-[18px] overflow-hidden select-none bg-[#0c0d12] border border-zinc-800/90 ${
          effectiveDisableTilt || !effectiveInteractive ? 'pointer-events-none' : 'cursor-pointer'
        }`}
      >
        {/* ============================================================
            SVG DEF BLOCK: Procedural Filters & Shaders
            ============================================================ */}
        <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
          <defs>
            {/* Paper Tooth Micro Noise Filter (Layer 0) */}
            <filter id={paperToothNoiseId} x="0%" y="0%" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.75"
                numOctaves="4"
                stitchTiles="stitch"
                result="paperGrain"
              />
              <feColorMatrix type="saturate" values="0" result="desaturatedGrain" />
              <feComponentTransfer in="desaturatedGrain" result="grainContrast">
                <feFuncA type="linear" slope="0.04" />
              </feComponentTransfer>
            </filter>

            {/* Micro-Etched Relief Map Shader (Layer 2) */}
            <filter id={reliefFilterId} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.035 0.08"
                numOctaves="3"
                seed="42"
                result="tactileNoise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="tactileNoise"
                scale="5"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displacedRelief"
              />
              <feSpecularLighting
                in="displacedRelief"
                surfaceScale="3.5"
                specularConstant="1.6"
                specularExponent="24"
                lightingColor="#ffffff"
                result="specularHighlight"
              >
                <feDistantLight
                  azimuth={uniforms.holographicAngle}
                  elevation={45}
                />
              </feSpecularLighting>
              <feComposite
                in="specularHighlight"
                in2="SourceAlpha"
                operator="in"
                result="reliefMasked"
              />
              <feBlend
                in="SourceGraphic"
                in2="reliefMasked"
                mode="screen"
              />
            </filter>

            {/* Metallic Gold Leaf Gradient (Layer 4) */}
            <linearGradient id={goldFoilGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bf953f" />
              <stop offset="25%" stopColor="#fcf6ba" />
              <stop offset="50%" stopColor="#b38728" />
              <stop offset="75%" stopColor="#fbf5b7" />
              <stop offset="100%" stopColor="#aa771c" />
            </linearGradient>
          </defs>
        </svg>

        {/* ============================================================
            LAYER 0: SUBSTRATE CORE (350gsm dark cardstock + micro noise)
            ============================================================ */}
        {isLayerActive(0) && (
          <div
            className="layer-0-substrate absolute inset-0 z-0 bg-[#0c0d12] pointer-events-none select-none"
            aria-label="Layer 0: Substrate Core"
          >
            {/* Embedded Procedural SVG Paper Tooth Noise Texture at 4% Opacity */}
            <div
              className="absolute inset-0 pointer-events-none opacity-4"
              style={{
                filter: `url(#${paperToothNoiseId})`,
                backgroundColor: '#ffffff',
                mixBlendMode: 'overlay',
              }}
            />
            {/* Subtle Vignette Shading */}
            <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/60 pointer-events-none" />
          </div>
        )}

        {/* ============================================================
            LAYER 1: FULL-BLEED ARTWORK & AUTHENTIC FRAME
            ============================================================ */}
        {isLayerActive(1) && (
          <div
            className="layer-1-artwork absolute inset-[6px] rounded-[13px] bg-[#0a0a0f] flex flex-col justify-between overflow-hidden z-10 border border-zinc-800/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] pointer-events-none select-none"
            aria-label="Layer 1: Full-Bleed Artwork"
          >
            {/* Top Character Name Banner & Rarity Badge */}
            <header className="relative flex items-center justify-between gap-1.5 px-3 py-1.5 bg-gradient-to-b from-black/90 via-zinc-950/80 to-transparent z-30 border-b border-white/10">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-sm shrink-0 drop-shadow" title={theme.name}>
                  {theme.symbol}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold tracking-tight text-white text-xs sm:text-sm drop-shadow truncate">
                    {cardTitle}
                  </h3>
                  <span className="text-[9px] text-zinc-400 font-mono tracking-wider block -mt-0.5">
                    {theme.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {gradeBadge && !isThumbnail ? (
                  <span className={`font-mono shrink-0 ${gradeBadge.className}`}>
                    {gradeBadge.label}
                  </span>
                ) : (
                  <span
                    className={`text-[10px] px-2 py-0.5 font-black rounded border tracking-wider uppercase font-mono shadow-sm ${rarityBadge.bgClass} ${rarityBadge.textClass} ${rarityBadge.borderClass}`}
                  >
                    {rarityBadge.label}
                  </span>
                )}
              </div>
            </header>

            {/* Central Illustration Well */}
            <main className="relative flex-1 w-full overflow-hidden bg-[#0d0d12] flex items-center justify-center">
              {/* Character Thematic Backdrop Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-b ${theme.bgGradient} opacity-70 pointer-events-none`}
              />

              {/* Geometric Background Mesh */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(${theme.accent} 1.2px, transparent 1.2px)`,
                  backgroundSize: '18px 18px',
                }}
              />

              {/* Character Illustration */}
              {currentSrc && !hasImageError ? (
                <img
                  ref={imgRef}
                  src={encodeURI(currentSrc)}
                  alt={cardName}
                  onError={handleImageError}
                  className="w-full h-full object-cover object-top select-none pointer-events-none transition-opacity duration-200"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                /* High-tech Obsidian Metallic Visual Fallback */
                <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center">
                  <div
                    className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center mb-2 border shadow-2xl backdrop-blur-sm"
                    style={{
                      background: `linear-gradient(135deg, ${theme.accent}30 0%, #101018 60%, ${theme.accent}15 100%)`,
                      borderColor: `${theme.accent}88`,
                      boxShadow: `0 0 25px ${theme.glowColor}`,
                    }}
                  >
                    <span
                      className="text-2xl font-black font-mono uppercase tracking-wider"
                      style={{ color: theme.accent }}
                    >
                      {CHARACTER_INITIALS[characterId] ?? 'TQQ'}
                    </span>
                    <span className="text-sm">{theme.symbol}</span>
                  </div>
                  <div className="font-bold text-white text-sm drop-shadow">{cardName}</div>
                  <div className="text-[11px] text-zinc-400 font-medium">{characterRole}</div>
                </div>
              )}

              {/* Lore Quote Callout Overlay */}
              {cardLoreQuote && !shouldHideFooter && (
                <div className="absolute bottom-2 inset-x-3 rounded-lg border border-white/10 bg-black/65 backdrop-blur-xs p-1.5 text-center shadow-lg pointer-events-none">
                  <p className="text-[9.5px] sm:text-[10px] text-white/90 line-clamp-2 leading-snug font-serif italic">
                    &ldquo;{cardLoreQuote}&rdquo;
                  </p>
                </div>
              )}
            </main>

            {/* Bottom Card Footer: Serial, Finish & Market Value */}
            {!shouldHideFooter && (
              <footer className="relative flex items-center justify-between px-3 py-1.5 bg-gradient-to-t from-black/95 via-zinc-950/85 to-transparent z-30 border-t border-white/10 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 font-bold">{cardNumber}</span>
                  <span
                    className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider"
                    style={{
                      color: theme.accent,
                      backgroundColor: `${theme.accent}20`,
                      border: `1px solid ${theme.accent}40`,
                    }}
                  >
                    {FINISH_LABELS[finishForBadge]}
                  </span>
                </div>

                {showMarketValue && (
                  <div className="font-bold text-amber-400 flex items-center gap-0.5">
                    <span>¥</span>
                    <span>{marketValue.toLocaleString()}</span>
                  </div>
                )}
              </footer>
            )}
          </div>
        )}

        {/* ============================================================
            LAYER 2: MICRO-ETCHED RELIEF MAP (Weiss Schwarz SP Guilloché)
            ============================================================ */}
        {isLayerActive(2) && (
          <div
            className="layer-2-micro-relief absolute inset-[6px] rounded-[13px] pointer-events-none select-none z-20 overflow-hidden"
            style={{
              mixBlendMode: 'color-dodge',
              opacity: `calc(var(--glare-opacity, 0) * 0.85)`,
            }}
            aria-label="Layer 2: Micro-Etched Relief Map"
          >
            {/* Concentric Guilloché Security Rosettes & Fingerprint Wave Ridges */}
            <svg
              viewBox="0 0 360 502"
              className="w-full h-full"
              preserveAspectRatio="none"
              style={{ filter: `url(#${reliefFilterId})` }}
              aria-hidden="true"
            >
              {/* Concentric Guilloché Circles */}
              <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8">
                <circle cx="180" cy="251" r="140" strokeDasharray="3 2" />
                <circle cx="180" cy="251" r="115" strokeWidth="0.6" />
                <circle cx="180" cy="251" r="90" strokeDasharray="4 2" />
                <circle cx="180" cy="251" r="65" strokeWidth="0.5" />
                <circle cx="180" cy="251" r="40" strokeDasharray="2 2" />
              </g>

              {/* Fingerprint Micro-Ridge Wave Lines */}
              <g fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.75" strokeLinecap="round">
                <path d="M 20 80 Q 90 60, 180 85 T 340 75" />
                <path d="M 15 120 Q 100 95, 180 125 T 345 110" />
                <path d="M 20 160 Q 110 135, 180 165 T 340 150" />
                <path d="M 25 200 Q 120 180, 180 205 T 335 195" />
                <path d="M 25 300 Q 120 320, 180 295 T 335 305" />
                <path d="M 20 340 Q 110 365, 180 335 T 340 350" />
                <path d="M 15 380 Q 100 405, 180 375 T 345 390" />
                <path d="M 20 420 Q 90 440, 180 415 T 340 425" />
              </g>

              {/* Geometric Border Relief Lines */}
              <rect
                x="8"
                y="8"
                width="344"
                height="486"
                rx="10"
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="1.2"
                strokeDasharray="8 4"
              />
            </svg>
          </div>
        )}

        {/* ============================================================
            LAYER 3: PRISMATIC RAINBOW HOLOGRAM
            ============================================================ */}
        {isLayerActive(3) && (
          <div
            className="layer-3-prismatic-rainbow absolute inset-0 rounded-[18px] pointer-events-none select-none z-25 overflow-hidden"
            style={{
              background: `conic-gradient(
                from var(--holo-angle, 0deg) at var(--specular-x, 50%) var(--specular-y, 50%),
                #ff0055 0deg,
                #ff9900 60deg,
                #ffee00 120deg,
                #00ff66 180deg,
                #0099ff 240deg,
                #aa00ff 300deg,
                #ff0055 360deg
              )`,
              mixBlendMode: 'color-dodge',
              opacity: `calc(var(--glare-opacity, 0) * 0.7)`,
            }}
            aria-label="Layer 3: Prismatic Rainbow Hologram"
          >
            {/* Secondary Chromatic Dispersion Diffraction Bands */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `repeating-linear-gradient(
                  calc(var(--holo-angle, 0deg) + 45deg),
                  rgba(255, 0, 85, 0.15) 0px,
                  rgba(255, 153, 0, 0.15) 10px,
                  rgba(255, 238, 0, 0.15) 20px,
                  rgba(0, 255, 102, 0.15) 30px,
                  rgba(0, 153, 255, 0.15) 40px,
                  rgba(170, 0, 255, 0.15) 50px,
                  rgba(255, 0, 85, 0.15) 60px
                )`,
                mixBlendMode: 'overlay',
              }}
            />
          </div>
        )}

        {/* ============================================================
            LAYER 4: HOT-STAMPED GOLD FOIL MASK & VA SIGNATURE
            ============================================================ */}
        {isLayerActive(4) && (
          <div
            className="layer-4-gold-foil absolute inset-0 rounded-[18px] pointer-events-none select-none z-30 overflow-hidden"
            aria-label="Layer 4: Hot-Stamped Gold Foil Mask & VA Signature"
          >
            {/* Ornate Metallic Gold Leaf Frame Borders & Corner Flourishes */}
            <div
              className="absolute inset-[3px] rounded-[15px] pointer-events-none select-none"
              style={{
                border: '2px solid transparent',
                borderImage: `linear-gradient(
                  135deg,
                  #bf953f 0%,
                  #fcf6ba 25%,
                  #b38728 50%,
                  #fbf5b7 75%,
                  #aa771c 100%
                ) 1`,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.85))',
              }}
            />

            {/* Corner Filigree Brackets */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 360 502"
              aria-hidden="true"
            >
              {/* Top-Left Corner Filigree */}
              <path
                d="M 10 32 L 10 14 C 10 12 12 10 14 10 L 32 10 M 14 14 L 26 26"
                fill="none"
                stroke={`url(#${goldFoilGradId})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.85))"
              />
              {/* Top-Right Corner Filigree */}
              <path
                d="M 350 32 L 350 14 C 350 12 348 10 346 10 L 328 10 M 346 14 L 334 26"
                fill="none"
                stroke={`url(#${goldFoilGradId})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.85))"
              />
              {/* Bottom-Left Corner Filigree */}
              <path
                d="M 10 470 L 10 488 C 10 490 12 492 14 492 L 32 492 M 14 488 L 26 476"
                fill="none"
                stroke={`url(#${goldFoilGradId})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.85))"
              />
              {/* Bottom-Right Corner Filigree */}
              <path
                d="M 350 470 L 350 488 C 350 490 348 492 346 492 L 328 492 M 346 488 L 334 476"
                fill="none"
                stroke={`url(#${goldFoilGradId})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.85))"
              />
            </svg>

            {/* Character Voice Actress Hot-Stamped Signature Overlay */}
            {isSigned && (
              <FoilSignatureOverlay
                characterId={characterId}
                characterName={cardName}
                showSpecularShimmer={true}
                showHankoSeal={!isThumbnail}
              />
            )}
          </div>
        )}

        {/* ============================================================
            FINISH-SPECIFIC OVERLAYS FOR BASE FINISHES (Holo, Sparkle, Raw)
            ============================================================ */}
        {isHolo && (
          <div
            className="finish-holo-overlay absolute inset-0 pointer-events-none select-none z-22"
            style={{
              background: `linear-gradient(
                var(--holo-angle, 135deg),
                transparent 15%,
                rgba(255, 255, 255, 0.45) 50%,
                transparent 85%
              )`,
              mixBlendMode: 'color-dodge',
              opacity: `calc(var(--glare-opacity, 0) * 0.85)`,
            }}
          />
        )}

        {isSparkle && (
          <div
            className="finish-sparkle-stars absolute inset-0 pointer-events-none select-none z-22"
            style={{
              backgroundImage: `radial-gradient(circle 2px at var(--specular-x, 50%) var(--specular-y, 50%), #ffffff 100%, transparent 0)`,
              backgroundSize: '24px 24px',
              mixBlendMode: 'screen',
              opacity: `calc(var(--glare-opacity, 0) * 0.9)`,
            }}
          />
        )}

        {isRaw && (
          <div className="finish-raw absolute inset-0 pointer-events-none select-none z-22 opacity-25" />
        )}

        {/* ============================================================
            SPECULAR SURFACE LAMINATE GLARE (PHYSICAL SHINE)
            ============================================================ */}
        <div
          className="specular-laminate-glare absolute inset-0 pointer-events-none select-none z-40 rounded-[18px]"
          style={{
            background: `radial-gradient(
              circle 260px at var(--specular-x, 50%) var(--specular-y, 50%),
              rgba(255, 255, 255, 0.5) 0%,
              rgba(255, 255, 255, 0.15) 35%,
              rgba(255, 255, 255, 0.03) 60%,
              transparent 85%
            )`,
            opacity: `var(--glare-opacity, 0)`,
            mixBlendMode: 'screen',
          }}
        />
      </motion.div>
    </div>
  );
};

export default RealisticCardRenderer;
