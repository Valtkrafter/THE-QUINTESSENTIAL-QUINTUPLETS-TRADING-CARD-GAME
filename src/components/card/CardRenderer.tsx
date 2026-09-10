'use client';

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { CardDefinition, CardInstance, CharacterId, Finish, Rarity } from '../../types/card';
import { CARD_MAP, getCardDef } from '../../config/cardsData';
import { calculateCardMarketValue } from '../../config/economy';

export interface CardRendererProps {
  card: CardInstance | (CardDefinition & Partial<CardInstance>);
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showMarketValue?: boolean;
}

// Character visual theme styling
export const CHARACTER_THEMES: Record<
  CharacterId,
  {
    name: string;
    accent: string;
    glowColor: string;
    bgGradient: string;
    badgeBg: string;
    signatureName: string;
    symbol: string;
  }
> = {
  ichika: {
    name: 'Ichika Nakano',
    accent: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    bgGradient: 'from-amber-950/80 via-yellow-900/40 to-zinc-950',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    signatureName: '花澤 香菜 (Ichika)',
    symbol: '💛',
  },
  nino: {
    name: 'Nino Nakano',
    accent: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    bgGradient: 'from-pink-950/80 via-rose-900/40 to-zinc-950',
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    signatureName: '竹達 彩奈 (Nino)',
    symbol: '🦋',
  },
  miku: {
    name: 'Miku Nakano',
    accent: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    bgGradient: 'from-cyan-950/80 via-sky-900/40 to-zinc-950',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    signatureName: '伊藤 美来 (Miku)',
    symbol: '🎧',
  },
  yotsuba: {
    name: 'Yotsuba Nakano',
    accent: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    bgGradient: 'from-emerald-950/80 via-teal-900/40 to-zinc-950',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    signatureName: '佐倉 綾音 (Yotsuba)',
    symbol: '🍀',
  },
  itsuki: {
    name: 'Itsuki Nakano',
    accent: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    bgGradient: 'from-red-950/80 via-rose-950/40 to-zinc-950',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
    signatureName: '水瀬 いのり (Itsuki)',
    symbol: '⭐',
  },
  fuutarou: {
    name: 'Fuutarou Uesugi',
    accent: '#64748B',
    glowColor: 'rgba(100, 116, 139, 0.4)',
    bgGradient: 'from-slate-900/80 via-zinc-900/50 to-black',
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    signatureName: '松岡 禎丞 (Fuutarou)',
    symbol: '📖',
  },
  raiha: {
    name: 'Raiha Uesugi',
    accent: '#FBBF24',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    bgGradient: 'from-amber-950/70 via-yellow-900/30 to-zinc-950',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    signatureName: '高森 奈津美 (Raiha)',
    symbol: '✨',
  },
  maruo: {
    name: 'Maruo Nakano',
    accent: '#475569',
    glowColor: 'rgba(71, 85, 105, 0.35)',
    bgGradient: 'from-zinc-900 via-slate-950 to-black',
    badgeBg: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
    signatureName: '黒田 崇矢 (Maruo)',
    symbol: '👓',
  },
  isanari: {
    name: 'Isanari Uesugi',
    accent: '#D97706',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    bgGradient: 'from-orange-950 via-zinc-900 to-black',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    signatureName: '日野 聡 (Isanari)',
    symbol: '🏍️',
  },
  takeda: {
    name: 'Yusuke Takeda',
    accent: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    bgGradient: 'from-purple-950 via-indigo-950 to-black',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    signatureName: '斉藤 壮馬 (Takeda)',
    symbol: '🚀',
  },
};

// Rarity badge styling
export const RARITY_BADGES: Record<
  Rarity,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  C: {
    label: 'C',
    textClass: 'text-zinc-300',
    bgClass: 'bg-zinc-800/80',
    borderClass: 'border-zinc-600',
  },
  UC: {
    label: 'UC',
    textClass: 'text-emerald-300',
    bgClass: 'bg-emerald-950/80',
    borderClass: 'border-emerald-500/60',
  },
  R: {
    label: 'R',
    textClass: 'text-blue-300',
    bgClass: 'bg-blue-950/80',
    borderClass: 'border-blue-500/60',
  },
  SR: {
    label: 'SR',
    textClass: 'text-purple-300',
    bgClass: 'bg-purple-950/80',
    borderClass: 'border-purple-500/70',
  },
  UR: {
    label: 'UR',
    textClass: 'text-amber-300 font-bold',
    bgClass: 'bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950',
    borderClass: 'border-amber-400',
  },
  SEC: {
    label: 'SEC',
    textClass: 'text-rose-200 font-extrabold tracking-wider',
    bgClass: 'bg-gradient-to-r from-rose-950 via-fuchsia-950 to-indigo-950',
    borderClass: 'border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
  },
  MR: {
    label: 'MR',
    textClass: 'text-yellow-100 font-black tracking-widest',
    bgClass: 'bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 text-black',
    borderClass: 'border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.8)]',
  },
};

export const FINISH_LABELS: Record<Finish, string> = {
  raw: 'RAW',
  holo: 'SILVER HOLO',
  sparkle: 'STARLIGHT SPARKLE',
  rainbow: 'PRISM RAINBOW',
  gold_etched: 'GOLD ETCHED',
  signed: 'VOICE ACTOR STAMP',
};

export const CardRenderer: React.FC<CardRendererProps> = ({
  card,
  interactive = true,
  size = 'md',
  className = '',
  onClick,
  showMarketValue = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  // Safely resolve the card definition
  const cardDefId =
    ('cardDefId' in card ? card.cardDefId : undefined) ??
    ('id' in card ? card.id : undefined);
  const cardDef = (cardDefId ? getCardDef(cardDefId) : undefined) ?? CARD_MAP['miku_c_01'];

  // Resolve raw image URL from card or cardDef (handling both imageUrl and image keys)
  const rawImageUrl =
    card.imageUrl ??
    (card as any).image ??
    cardDef?.imageUrl ??
    (cardDef as any)?.image;

  // Resolve metadata
  const characterId: CharacterId = card.characterId ?? cardDef?.characterId ?? 'miku';
  const rarity: Rarity = card.rarity ?? cardDef?.rarity ?? 'C';
  const finish: Finish = card.finish ?? 'raw';
  const theme = CHARACTER_THEMES[characterId] ?? CHARACTER_THEMES.miku;
  const rarityBadge = RARITY_BADGES[rarity] ?? RARITY_BADGES.C;
  const marketValue = calculateCardMarketValue(
    'finish' in card ? (card as CardInstance) : { ...cardDef, finish, obtainedAt: 0, cardDefId: cardDef.id }
  );

  const cardName = card.name ?? (card as any).name ?? cardDef?.name ?? theme.name;
  const cardTitle = card.title ?? (card as any).title ?? cardDef?.title ?? cardDef?.name ?? 'Collector Card';
  const cardLoreQuote = (card as any).loreQuote ?? cardDef?.loreQuote ?? '';
  const cardNumber = card.cardNumber ?? (card as any).cardNumber ?? cardDef?.cardNumber ?? 'TQQ-000';
  const characterRole = (card as any).characterRole ?? cardDef?.characterRole ?? 'sister';

  // Ensure path starts with /cards/ and is unencoded so encodeURI cleanly encodes spaces without double-encoding
  const resolvedImageUrl = useMemo(() => {
    if (!rawImageUrl) return '';
    let pathStr = String(rawImageUrl).trim();
    if (!pathStr.startsWith('/') && !pathStr.startsWith('http')) {
      pathStr = '/' + pathStr;
    }
    try {
      return decodeURI(pathStr);
    } catch {
      return pathStr;
    }
  }, [rawImageUrl]);

  // Reset image error state whenever resolvedImageUrl changes
  useEffect(() => {
    setHasImageError(false);
  }, [resolvedImageUrl]);

  console.log("[CardRenderer Debug]", {
    cardId: card?.id,
    cardNumber: card?.cardNumber ?? cardDef?.cardNumber,
    directImageUrl: card?.imageUrl,
    resolvedImageUrl,
    hasImageError,
  });

  // Pointer tilt physics calculation
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));

      // Pitch and yaw clamped to +/- 16 degrees
      const rotY = Number((((xPct - 50) / 50) * 16).toFixed(2));
      const rotX = Number((-((yPct - 50) / 50) * 16).toFixed(2));

      const cardEl = cardRef.current;
      cardEl.style.setProperty('--rot-x', `${rotX}deg`);
      cardEl.style.setProperty('--rot-y', `${rotY}deg`);
      cardEl.style.setProperty('--glare-x', `${xPct.toFixed(1)}%`);
      cardEl.style.setProperty('--glare-y', `${yPct.toFixed(1)}%`);
      cardEl.style.setProperty('--glare-opacity', '0.75');
    },
    [interactive]
  );

  const handlePointerLeave = useCallback(() => {
    if (!interactive || !cardRef.current) return;
    setIsHovered(false);

    const cardEl = cardRef.current;
    cardEl.style.setProperty('--rot-x', '0deg');
    cardEl.style.setProperty('--rot-y', '0deg');
    cardEl.style.setProperty('--glare-opacity', '0');
  }, [interactive]);

  const handlePointerEnter = useCallback(() => {
    if (!interactive) return;
    setIsHovered(true);
  }, [interactive]);

  // Dimensions based on standard 63mm x 88mm ratio
  const sizeClasses = {
    sm: 'w-[189px] h-[264px] text-xs', // 3x scale down
    md: 'w-[280px] h-[391px] text-sm', // standard display
    lg: 'w-[350px] h-[489px] text-base', // detailed view
  }[size];

  return (
    <div
      className={`card-perspective-wrapper inline-block select-none ${className}`}
      onClick={onClick}
    >
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{
          transform: 'rotateX(var(--rot-x, 0deg)) rotateY(var(--rot-y, 0deg))',
          backfaceVisibility: 'visible',
          WebkitBackfaceVisibility: 'visible',
          boxShadow: isHovered
            ? `0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 25px ${theme.glowColor}`
            : '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 10px rgba(0, 0, 0, 0.4)',
        }}
        className={`card-3d-root relative ${sizeClasses} aspect-[63/88] rounded-xl overflow-hidden cursor-pointer bg-zinc-950 border border-zinc-800 ${
          isHovered ? 'is-interacting' : ''
        }`}
      >
        {/* Ambient Character Rim Glow (z-10) */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 z-10"
          style={{
            boxShadow: `inset 0 0 16px ${theme.accent}33, inset 0 0 1px ${theme.accent}88`,
            border: `1.5px solid ${theme.accent}55`,
          }}
        />

        {/* Outer Card Matte Border (z-20) */}
        <div className="absolute inset-[3px] rounded-[10px] bg-gradient-to-b from-zinc-900 to-black p-2 flex flex-col justify-between overflow-hidden z-20">
          {/* HEADER: Title & Rarity & Symbol (z-30) */}
          <div className="relative flex items-center justify-between gap-1 pb-1 border-b border-zinc-800/80 z-30">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs" title={theme.name}>
                {theme.symbol}
              </span>
              <h3 className="font-bold tracking-tight truncate text-zinc-100 text-xs sm:text-sm drop-shadow">
                {cardTitle}
              </h3>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${rarityBadge.bgClass} ${rarityBadge.textClass} ${rarityBadge.borderClass}`}
              >
                {rarityBadge.label}
              </span>
            </div>
          </div>

          {/* MAIN ARTWORK FRAME (z-10) */}
          <div className="relative flex-1 w-full my-1 rounded-lg overflow-hidden border border-zinc-700/60 bg-[#0d0d12] z-10 flex flex-col justify-between items-center group">
            {/* BASE ARTWORK & FALLBACK LAYER (z-0) */}
            <div className="absolute inset-0 w-full h-full overflow-hidden rounded-lg bg-[#0d0d12] z-0">
              {/* Thematic Character Backdrop Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-b ${theme.bgGradient} opacity-60 pointer-events-none`}
              />

              {/* Geometric Hologram Grid Pattern */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(${theme.accent} 1px, transparent 1px)`,
                  backgroundSize: '16px 16px',
                }}
              />

              {/* Artwork Image (Dual-Layer Adaptive Presentation) or Visual Error Fallback */}
              {resolvedImageUrl ? (
                <div className="relative w-full h-full overflow-hidden rounded-lg bg-[#0d0d12]">
                  {/* Layer 1: Ambient Background Fill (Eliminates Letterboxing/Bars) */}
                  <img
                    src={encodeURI(resolvedImageUrl)}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover object-center scale-125 blur-xl opacity-40 brightness-75 select-none pointer-events-none"
                  />

                  {/* Layer 2: Uncompromised Foreground Artwork (Zero Crop) */}
                  <div className="relative z-10 flex h-full w-full items-center justify-center p-2">
                    <img
                      src={encodeURI(resolvedImageUrl)}
                      alt={cardName}
                      className="max-h-full max-w-full object-contain object-center select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:scale-105"
                      loading="eager"
                      decoding="async"
                      onError={() => {
                        console.error(`[IMAGE LOAD ERROR] Failed to fetch: "${resolvedImageUrl}"`);
                      }}
                    />
                  </div>

                  {/* Layer 3: Framing Vignette & Inner Shadow */}
                  <div className="pointer-events-none absolute inset-0 z-15 shadow-[inset_0_0_25px_rgba(0,0,0,0.85)]" />
                </div>
              ) : (
                /* Visual Error Fallback State */
                <div className="relative w-full h-full flex flex-col items-center justify-center p-3 text-center my-auto bg-gradient-to-br from-zinc-900 via-zinc-950 to-black select-none pointer-events-none z-0">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-2 shadow-inner border border-white/20 transition-transform duration-300 group-hover:scale-105"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${theme.accent}66, #09090b)`,
                      boxShadow: `0 0 20px ${theme.glowColor}`,
                    }}
                  >
                    <span className="text-2xl sm:text-3xl filter drop-shadow">
                      {theme.symbol}
                    </span>
                  </div>

                  <div className="font-extrabold tracking-wide text-zinc-100 text-xs sm:text-sm drop-shadow-md">
                    {cardName}
                  </div>

                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">
                    {characterRole === 'sister' ? 'Nakano Sister' : 'Support Character'}
                  </div>

                  <div
                    className="mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-wider uppercase"
                    style={{
                      color: theme.accent,
                      borderColor: `${theme.accent}66`,
                      backgroundColor: `${theme.accent}15`,
                    }}
                  >
                    {rarityBadge.label} • {FINISH_LABELS[finish]}
                  </div>
                </div>
              )}
            </div>

            {/* ARTWORK SPECIFIC SHADER FOIL OVERLAYS (z-20+, blend directly with base art) */}
            {finish === 'holo' && (
              <div className="finish-holo-overlay absolute inset-0 pointer-events-none z-20" />
            )}
            {finish === 'sparkle' && (
              <div className="finish-sparkle-overlay absolute inset-0 pointer-events-none z-20" />
            )}
            {finish === 'rainbow' && (
              <div className="finish-rainbow-overlay absolute inset-0 pointer-events-none z-20" />
            )}
            {finish === 'gold_etched' && (
              <div className="finish-gold-etched-relief absolute inset-0 pointer-events-none z-20" />
            )}

            {/* Top gradient shadow on art to preserve header contrast (z-25) */}
            <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-25" />

            {/* LORE QUOTE OVERLAY (z-30) */}
            {cardLoreQuote && (
              <div className="relative mt-auto w-full p-1.5 rounded-b-lg bg-black/80 backdrop-blur-md border-t border-zinc-800/80 text-center z-30 shadow-lg">
                <p className="text-[10px] sm:text-[11px] italic text-zinc-200 line-clamp-2 leading-tight">
                  &ldquo;{cardLoreQuote}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* FOOTER: Number, Finish, Market Value (z-30) */}
          <div className="relative flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80 z-30 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">{cardNumber}</span>
              <span
                className="px-1 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  color: theme.accent,
                  backgroundColor: `${theme.accent}15`,
                }}
              >
                {FINISH_LABELS[finish]}
              </span>
            </div>

            {showMarketValue && (
              <div className="font-bold text-amber-400 flex items-center gap-0.5">
                <span>¥</span>
                <span>{marketValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            CUSTOM FINISH OVERLAYS & SHADERS (Full-Card Scope)
            ============================================================ */}

        {/* Finish 1: Raw (Matte print texture) */}
        {finish === 'raw' && <div className="finish-raw absolute inset-0 pointer-events-none z-24" />}

        {/* Finish 2: Silver Holo (Micro-lines across card) */}
        {finish === 'holo' && <div className="finish-holo-lines pointer-events-none z-25" />}

        {/* Finish 3: Starlight Sparkle (Floating stars across card) */}
        {finish === 'sparkle' && <div className="finish-sparkle-stars pointer-events-none z-25" />}

        {/* Finish 4: Prism Rainbow (Shimmer light bar across card) */}
        {finish === 'rainbow' && <div className="finish-rainbow-shimmer pointer-events-none z-25" />}

        {/* Finish 5: Gold Etched (Embossed Relief Gold Borders & Texture) */}
        {finish === 'gold_etched' && (
          <>
            <div className="finish-gold-etched-frame pointer-events-none z-26" />
            <div className="finish-gold-texture pointer-events-none z-25" />
          </>
        )}

        {/* Finish 6: Signed (Voice Actor Hot Stamp Seal) */}
        {finish === 'signed' && (
          <>
            <div className="finish-holo-overlay opacity-40 pointer-events-none z-25" />
            <div className="finish-signed-stamp-container pointer-events-none z-35">
              <div className="finish-signed-gleam pointer-events-none" />
              <div className="finish-signed-stamp text-xs sm:text-sm font-black flex flex-col items-end leading-none">
                <span className="text-[9px] tracking-widest uppercase opacity-80">
                  Official Cast Stamp
                </span>
                <span className="text-base sm:text-lg tracking-wider">
                  {theme.signatureName.split(' ')[0]}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Specular Laminate Glare (Direct Light Reflection) (z-40) */}
        <div className="card-specular-glare pointer-events-none z-40" />
      </div>
    </div>
  );
};

export default CardRenderer;
