'use client';

import React from 'react';
import { motion, useMotionTemplate } from 'framer-motion';
import { CardInstance, GradeResult, GradeTier } from '../../types/card';
import { CARD_MAP, getCardDef } from '../../config/cardsData';
import { CardRenderer } from './CardRenderer';
import { useSmoothTilt } from '../../hooks/useSmoothTilt';

export interface GradingSlabProps {
  card: CardInstance;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  onClick?: () => void;
  showMarketValue?: boolean;
  mockGrade?: GradeResult; // Useful for previewing slabs in showcase
  showcaseMode?: boolean;
  thumbnail?: boolean;
}

export const GradingSlab: React.FC<GradingSlabProps> = ({
  card,
  interactive = true,
  size = 'md',
  className = '',
  onClick,
  showMarketValue = true,
  mockGrade,
  showcaseMode = false,
  thumbnail = false,
}) => {
  const activeGrade: GradeResult | undefined = card.grade ?? mockGrade;

  // Unified smooth tilt engine with derived light vector dynamics
  const {
    tiltStyle,
    isHovered,
    containerProps,
    light,
  } = useSmoothTilt({
    maxRotation: 12,
    perspective: 1200,
    disabled: !interactive || !activeGrade || thumbnail,
  });

  // If card is raw and no mockGrade provided, render standard raw card
  if (!activeGrade) {
    return (
      <CardRenderer
        card={card}
        interactive={interactive && !thumbnail}
        size={thumbnail ? 'full' : size}
        className={className}
        onClick={onClick}
        showMarketValue={showMarketValue && !showcaseMode && !thumbnail}
        hideInternalFooter={showcaseMode || thumbnail}
        showcaseMode={showcaseMode}
        thumbnail={thumbnail}
      />
    );
  }

  // Compact thumbnail mode for list drawers and small preview containers
  if (thumbnail) {
    const isBlackLabel = activeGrade.isBlackLabel || activeGrade.tier === 'BLACK_LABEL';
    const tier = activeGrade.tier;
    const num = activeGrade.numericGrade;

    // Micro Grade Pill per specification:
    // Grade 1–6: bg-zinc-800/95 text-zinc-300 border border-zinc-700 text-[8px] px-1 py-0.2 rounded
    // Grade 7–8: bg-slate-800/95 text-slate-200 border border-slate-600 text-[8px] px-1 py-0.2 rounded
    // Grade 9: bg-cyan-950/95 text-cyan-300 border border-cyan-500 text-[8px] px-1 py-0.2 rounded shadow-[0_0_6px_rgba(6,182,212,0.5)]
    // Grade 10 / Black Label: bg-amber-950/95 text-amber-300 border border-amber-400 text-[8px] px-1 py-0.2 rounded shadow-[0_0_8px_rgba(245,158,11,0.6)]
    let microBadgeClass = 'bg-zinc-800/95 text-zinc-300 border border-zinc-700 text-[8px] px-1 py-0.2 rounded';
    let microLabel = `Gr. ${num}`;

    if (isBlackLabel) {
      microBadgeClass = 'bg-amber-950/95 text-amber-300 border border-amber-400 text-[8px] px-1 py-0.2 rounded shadow-[0_0_8px_rgba(245,158,11,0.6)]';
      microLabel = 'BL 10';
    } else if (tier === 'GEM_MINT_10' || num === 10) {
      microBadgeClass = 'bg-amber-950/95 text-amber-300 border border-amber-400 text-[8px] px-1 py-0.2 rounded shadow-[0_0_8px_rgba(245,158,11,0.6)]';
      microLabel = 'Gr. 10';
    } else if (tier === 'MINT_9' || num === 9) {
      microBadgeClass = 'bg-cyan-950/95 text-cyan-300 border border-cyan-500 text-[8px] px-1 py-0.2 rounded shadow-[0_0_6px_rgba(6,182,212,0.5)]';
      microLabel = 'Gr. 9';
    } else if (tier === 'CRISP_7_8' || num >= 7) {
      microBadgeClass = 'bg-slate-800/95 text-slate-200 border border-slate-600 text-[8px] px-1 py-0.2 rounded';
      microLabel = `Gr. ${num}`;
    }

    return (
      <div
        className={`relative w-full h-full select-none rounded-lg p-0.5 border border-white/20 bg-white/5 flex items-center justify-center overflow-hidden ${
          isBlackLabel ? 'border-amber-400/40 bg-amber-950/10' : ''
        } ${interactive && onClick ? 'cursor-pointer' : 'pointer-events-none'} ${className}`}
        onClick={onClick}
      >
        {/* Inner Card Artwork spanning 100% width and 100% height */}
        <div className="w-full h-full relative rounded-[6px] overflow-hidden flex items-center justify-center pointer-events-none">
          <CardRenderer
            card={card}
            interactive={false}
            disableTilt={true}
            size="full"
            className="w-full h-full !p-0 !m-0 rounded-[6px] overflow-hidden"
            showMarketValue={false}
            hideInternalFooter={true}
            showcaseMode={true}
            thumbnail={true}
          />
        </div>

        {/* Sleek Micro Grade Pill in Top-Right Corner */}
        <div className="absolute top-1 right-1 z-30 pointer-events-none font-mono font-bold tracking-tight">
          <span className={microBadgeClass}>
            {microLabel}
          </span>
        </div>
      </div>
    );
  }

  const cardDef = getCardDef(card.cardDefId) ?? CARD_MAP['miku_c_01'];
  const isBlackLabel = activeGrade.isBlackLabel || activeGrade.tier === 'BLACK_LABEL';
  const tier = activeGrade.tier;

  // Scaled dimensions to fit around standard 63mm x 88mm card (authentic BGS slab ratio 82mm x 130mm, or dynamic uniform padding in showcaseMode)
  const slabSizeClasses = showcaseMode
    ? {
        sm: 'w-[190px] max-w-full aspect-[63/88] p-1.5',
        md: 'w-full max-w-[280px] aspect-[63/88] p-1.5',
        lg: 'w-full max-w-[340px] aspect-[63/88] p-2',
        full: 'w-full h-full max-h-full max-w-full aspect-[63/88] p-1.5 sm:p-2',
      }[size]
    : {
        sm: 'w-[230px] max-w-full max-h-full aspect-[82/130] p-2.5 rounded-2xl',
        md: 'w-full max-w-[320px] max-h-full aspect-[82/130] p-3.5 rounded-3xl',
        lg: 'w-full max-w-[380px] max-h-full aspect-[82/130] p-4.5 rounded-3xl',
        full: 'w-full h-full max-h-full max-w-full aspect-[82/130] p-[3.5%] rounded-2xl sm:rounded-3xl',
      }[size];

  // Header Plate Styling per Grade Tier (for standard inspection/binder mode)
  const getHeaderStyle = (t: GradeTier) => {
    if (isBlackLabel || t === 'BLACK_LABEL') {
      return {
        plateBg: 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black',
        plateBorder: 'border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.35)]',
        accentText: 'text-amber-300',
        gradeText: 'text-amber-300 font-black',
        label: 'BLACK LABEL',
        certBg: 'bg-amber-950/60 text-amber-200 border-amber-500/50',
      };
    }
    if (t === 'GEM_MINT_10') {
      return {
        plateBg: 'bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 text-zinc-900',
        plateBorder: 'border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.4)]',
        accentText: 'text-zinc-800 font-bold',
        gradeText: 'text-red-600 font-black',
        label: 'PEAK FICTION',
        certBg: 'bg-yellow-400/40 text-zinc-900 border-yellow-600/60 font-mono',
      };
    }
    if (t === 'MINT_9') {
      return {
        plateBg: 'bg-gradient-to-r from-slate-200 via-cyan-100 to-slate-300 text-zinc-900',
        plateBorder: 'border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.35)]',
        accentText: 'text-cyan-950 font-bold',
        gradeText: 'text-cyan-800 font-black',
        label: 'GOD-TIER',
        certBg: 'bg-cyan-200/60 text-cyan-950 border-cyan-500/50 font-mono',
      };
    }
    // Grades 1–8 (Silver frosted)
    return {
      plateBg: 'bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 text-zinc-900',
      plateBorder: 'border-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.25)]',
      accentText: 'text-zinc-800 font-medium',
      gradeText: 'text-zinc-900 font-black',
      label: activeGrade.tierLabel.toUpperCase(),
      certBg: 'bg-zinc-200 text-zinc-800 border-zinc-400 font-mono',
    };
  };

  const headerStyle = getHeaderStyle(tier);
  const certNumber = `CERT #${(activeGrade.gradedAt % 90000 + 10000)}`;
  const isFull = size === 'full';

  return (
    /* Outermost Container with Container Query and conditional hit-area margins */
    <div
      className={`card-perspective-wrapper select-none relative ${
        isFull
          ? 'w-full h-full flex items-center justify-center'
          : 'w-full h-full flex items-center justify-center before:absolute before:-inset-4 before:content-[\'\']'
      } ${interactive ? 'cursor-pointer' : 'pointer-events-none'} ${className}`}
      style={{ containerType: 'inline-size' }}
      onClick={onClick}
      {...(interactive ? containerProps : {})}
    >
      <motion.div
        style={{
          ...tiltStyle,
          boxShadow: isBlackLabel
            ? '0 30px 60px -10px rgba(0,0,0,0.95), 0 0 25px rgba(212,175,55,0.35)'
            : isHovered
            ? '0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 20px rgba(255, 255, 255, 0.2)'
            : '0 20px 45px -10px rgba(0, 0, 0, 0.75)',
        }}
        className={`relative ${slabSizeClasses} ${
          isBlackLabel ? 'slab-acrylic-black-label' : 'slab-acrylic-casing'
        } ${
          showcaseMode
            ? '!rounded-2xl border border-white/15 ring-1 ring-inset ring-white/10'
            : ''
        } flex flex-col items-center justify-center pointer-events-none overflow-hidden`}
      >
        {/* Physical Beveled Glass Reflection Rim (Standard Mode Only) */}
        {!showcaseMode && <div className="slab-bevel-edge pointer-events-none" />}

        {/* 4 Sonic-Welded Corner Rivets (Standard Mode Only) */}
        {!showcaseMode && (
          <>
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner pointer-events-none" />
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner pointer-events-none" />
          </>
        )}

        {/* ============================================================
            SLAB HEADER LABEL PLATE (Standard Full BGS Mode Only)
            ============================================================ */}
        {!showcaseMode && (
          <div
            className={`w-full mb-[2.5%] shrink-0 rounded-lg border p-[3%] ${headerStyle.plateBg} ${headerStyle.plateBorder} relative overflow-hidden z-30 pointer-events-none crisp-render`}
          >
            {/* Subtle Security Guilloche Watermark Pattern */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '8px 8px',
              }}
            />

            <div className="relative z-10 flex items-start justify-between gap-1.5 pointer-events-none">
              {/* Left: Metadata */}
              <div className="flex-1 min-w-0 pointer-events-none">
                <div className="flex items-center gap-1.5 leading-none mb-1 flex-wrap">
                  <span className="text-[clamp(8px,3cqi,11px)] tracking-widest font-black uppercase text-amber-500">
                    TQQ VAULT
                  </span>
                  <span className="text-[clamp(7px,2.6cqi,10px)] px-1 py-0.2 rounded border bg-black/10 border-black/20 font-mono">
                    {certNumber}
                  </span>
                  {activeGrade.isRestored && (
                    <span className="text-[clamp(6px,2.2cqi,9px)] px-1.5 py-0.5 rounded font-black tracking-wide bg-gradient-to-r from-amber-500/30 to-amber-600/30 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                      RE-CERTIFIED / RESTORED
                    </span>
                  )}
                </div>

                <h4 className="font-extrabold text-[clamp(10px,4cqi,15px)] truncate leading-tight drop-shadow-sm">
                  {cardDef.name}
                </h4>

                <div className="flex items-center gap-1 text-[clamp(8px,3cqi,11px)] mt-0.5 opacity-90 truncate">
                  <span className="font-semibold">{cardDef.title}</span>
                  <span>•</span>
                  <span className="font-bold">{card.rarity}</span>
                </div>
              </div>

              {/* Right: Numeric Grade & Tier Badge */}
              <div className="flex flex-col items-end justify-center shrink-0 min-w-[50px] text-right pl-1.5 border-l border-black/10 pointer-events-none">
                <span className="text-[clamp(7px,2.5cqi,9px)] font-bold uppercase tracking-wider opacity-80">
                  {headerStyle.label}
                </span>
                <div className={`text-[clamp(16px,7.5cqi,30px)] leading-none ${headerStyle.gradeText}`}>
                  {activeGrade.numericGrade}.0
                </div>
                <span className="text-[clamp(7px,2.5cqi,9px)] font-semibold opacity-75">
                  {activeGrade.tierLabel}
                </span>
              </div>
            </div>

            {/* Subgrades Bar for Black Label & Pristine 10 */}
            {(isBlackLabel || tier === 'GEM_MINT_10') && (
              <div className="mt-1.5 pt-1 border-t border-black/15 flex items-center justify-between text-[clamp(7px,2.6cqi,10px)] font-mono leading-none pointer-events-none">
                <div className="flex flex-col items-center">
                  <span className="opacity-70 text-[clamp(6px,2.2cqi,8px)]">Centering</span>
                  <span className="font-bold">{activeGrade.subgrades.centering.toFixed(1)}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="opacity-70 text-[clamp(6px,2.2cqi,8px)]">Surface</span>
                  <span className="font-bold">{activeGrade.subgrades.surface.toFixed(1)}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="opacity-70 text-[clamp(6px,2.2cqi,8px)]">Corners</span>
                  <span className="font-bold">{activeGrade.subgrades.corners.toFixed(1)}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="opacity-70 text-[clamp(6px,2.2cqi,8px)]">Edges</span>
                  <span className="font-bold">{activeGrade.subgrades.edges.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            INNER RECESSED CARD WELL (Full-Art in showcaseMode)
            ============================================================ */}
        <div
          className={`w-full ${
            showcaseMode
              ? 'h-full !rounded-lg overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] border border-white/10 p-0'
              : 'flex-1 min-h-0 rounded-xl slab-inner-well bg-black/60 p-[1.5%] border border-white/10'
          } relative z-20 flex items-center justify-center pointer-events-none`}
        >
          <div
            className={`w-full ${
              showcaseMode ? 'h-full aspect-[63/88] !rounded-lg overflow-hidden' : 'h-full'
            } flex items-center justify-center pointer-events-none`}
          >
            <CardRenderer
              card={card}
              interactive={false} // Outer slab alone handles 3D physics
              disableTilt={true}   // Strict single source of truth
              externalLight={light} // Propagates tilt light to inner card shaders
              size="full"
              className="w-full h-full !p-0 !m-0 !rounded-lg overflow-hidden"
              showMarketValue={showMarketValue && !showcaseMode}
              hideInternalFooter={true}
              showcaseMode={showcaseMode}
            />
          </div>
        </div>

        {/* Bottom Bar: Acrylic Refraction Stamp & Multiplier (Standard Mode Only) */}
        {!showcaseMode && (
          <div className="w-full mt-[2%] shrink-0 flex items-center justify-between text-[clamp(7px,2.8cqi,10px)] text-zinc-400 px-1 z-30 font-mono pointer-events-none crisp-render">
            <span className="text-zinc-500 uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Authenticated Vault Slab
            </span>

            <span
              className={`font-bold px-1.5 py-0.2 rounded border ${
                isBlackLabel
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-600'
              }`}
            >
              {activeGrade.multiplier}x Multiplier
            </span>
          </div>
        )}

        {/* Acrylic Surface Glare (Outer Glass Layer) */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-50 rounded-2xl mix-blend-overlay"
          style={{
            background: useMotionTemplate`radial-gradient(circle 380px at ${light.lightX} ${light.lightY}, rgba(255, 255, 255, 0.35) 0%, transparent 70%)`,
            opacity: light.sheenOpacity,
          }}
        />
      </motion.div>
    </div>
  );
};

export default GradingSlab;
