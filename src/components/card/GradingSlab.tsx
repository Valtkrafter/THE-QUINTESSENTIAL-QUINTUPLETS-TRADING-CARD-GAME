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
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showMarketValue?: boolean;
  mockGrade?: GradeResult; // Useful for previewing slabs in showcase
}

export const GradingSlab: React.FC<GradingSlabProps> = ({
  card,
  interactive = true,
  size = 'md',
  className = '',
  onClick,
  showMarketValue = true,
  mockGrade,
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
    disabled: !interactive || !activeGrade,
  });

  // If card is raw and no mockGrade provided, render standard raw card
  if (!activeGrade) {
    return (
      <CardRenderer
        card={card}
        interactive={interactive}
        size={size}
        className={className}
        onClick={onClick}
        showMarketValue={showMarketValue}
      />
    );
  }

  const cardDef = getCardDef(card.cardDefId) ?? CARD_MAP['miku_c_01'];
  const isBlackLabel = activeGrade.isBlackLabel || activeGrade.tier === 'BLACK_LABEL';
  const tier = activeGrade.tier;

  // Scaled dimensions to fit around standard 63mm x 88mm card
  const slabSizeClasses = {
    sm: 'w-[230px] p-2.5 rounded-2xl',
    md: 'w-[325px] p-3.5 rounded-3xl',
    lg: 'w-[400px] p-4.5 rounded-3xl',
  }[size];

  // Header Plate Styling per Grade Tier
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

  return (
    /* Outermost Container with Extended Hit Area Buffer to prevent mouse slipping off during 3D tilt */
    <div
      className={`card-perspective-wrapper inline-block select-none p-4 -m-4 sm:p-6 sm:-m-6 relative before:absolute before:-inset-4 before:content-[''] cursor-pointer ${className}`}
      onClick={onClick}
      {...containerProps}
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
        } flex flex-col items-center pointer-events-none`}
      >
        {/* Physical Beveled Glass Reflection Rim */}
        <div className="slab-bevel-edge pointer-events-none" />

        {/* 4 Sonic-Welded Corner Rivets */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner pointer-events-none" />
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner pointer-events-none" />

        {/* ============================================================
            SLAB HEADER LABEL PLATE (pointer-events-none)
            ============================================================ */}
        <div
          className={`w-full mb-3 rounded-lg border p-2.5 ${headerStyle.plateBg} ${headerStyle.plateBorder} relative overflow-hidden z-30 pointer-events-none`}
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

          <div className="relative z-10 flex items-start justify-between gap-2 pointer-events-none">
            {/* Left: Metadata */}
            <div className="flex-1 min-w-0 pointer-events-none">
              <div className="flex items-center gap-1.5 leading-none mb-1">
                <span className="text-[10px] tracking-widest font-black uppercase text-amber-500">
                  TQQ VAULT
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded border bg-black/10 border-black/20 font-mono">
                  {certNumber}
                </span>
              </div>

              <h4 className="font-extrabold text-xs sm:text-sm truncate leading-tight drop-shadow-sm">
                {cardDef.name}
              </h4>

              <div className="flex items-center gap-1 text-[10px] mt-0.5 opacity-90 truncate">
                <span className="font-semibold">{cardDef.title}</span>
                <span>•</span>
                <span className="font-bold">{card.rarity}</span>
              </div>
            </div>

            {/* Right: Numeric Grade & Tier Badge */}
            <div className="flex flex-col items-end justify-center shrink-0 min-w-[65px] text-right pl-2 border-l border-black/10 pointer-events-none">
              <span className="text-[8px] font-bold uppercase tracking-wider opacity-80">
                {headerStyle.label}
              </span>
              <div className={`text-2xl sm:text-3xl leading-none ${headerStyle.gradeText}`}>
                {activeGrade.numericGrade}.0
              </div>
              <span className="text-[8px] font-semibold opacity-75">
                {activeGrade.tierLabel}
              </span>
            </div>
          </div>

          {/* Subgrades Bar for Black Label & Pristine 10 */}
          {(isBlackLabel || tier === 'GEM_MINT_10') && (
            <div className="mt-2 pt-1.5 border-t border-black/15 flex items-center justify-between text-[9px] font-mono leading-none pointer-events-none">
              <div className="flex flex-col items-center">
                <span className="opacity-70 text-[8px]">Centering</span>
                <span className="font-bold">{activeGrade.subgrades.centering.toFixed(1)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="opacity-70 text-[8px]">Surface</span>
                <span className="font-bold">{activeGrade.subgrades.surface.toFixed(1)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="opacity-70 text-[8px]">Corners</span>
                <span className="font-bold">{activeGrade.subgrades.corners.toFixed(1)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="opacity-70 text-[8px]">Edges</span>
                <span className="font-bold">{activeGrade.subgrades.edges.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            INNER RECESSED CARD WELL (disableTilt={true} + pointer-events-none)
            ============================================================ */}
        <div className="w-full flex justify-center items-center rounded-xl slab-inner-well bg-black/60 p-1 relative z-20 overflow-hidden border border-white/10 pointer-events-none">
          <div className="pointer-events-none">
            <CardRenderer
              card={card}
              interactive={false} // Outer slab alone handles 3D physics
              disableTilt={true}   // Strict single source of truth
              externalLight={light} // Propagates tilt light to inner card shaders
              size={size}
              showMarketValue={showMarketValue}
            />
          </div>
        </div>

        {/* Bottom Bar: Acrylic Refraction Stamp & Multiplier */}
        <div className="w-full mt-2.5 flex items-center justify-between text-[10px] text-zinc-400 px-1 z-30 font-mono pointer-events-none">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
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
