'use client';

import React, { useRef, useState, useCallback } from 'react';
import { CardInstance, GradeResult, GradeTier } from '../../types/card.js';
import { CARD_MAP, getCardDef } from '../../config/cardsData.js';
import { CardRenderer } from './CardRenderer';

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
  const slabRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const activeGrade: GradeResult | undefined = card.grade ?? mockGrade;

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

  // Pointer tilt physics for the entire acrylic slab unit
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !slabRef.current) return;

      const rect = slabRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));

      const rotY = Number((((xPct - 50) / 50) * 15).toFixed(2));
      const rotX = Number((-((yPct - 50) / 50) * 15).toFixed(2));

      const el = slabRef.current;
      el.style.setProperty('--rot-x', `${rotX}deg`);
      el.style.setProperty('--rot-y', `${rotY}deg`);
      el.style.setProperty('--glare-x', `${xPct.toFixed(1)}%`);
      el.style.setProperty('--glare-y', `${yPct.toFixed(1)}%`);
      el.style.setProperty('--glare-opacity', '0.65');
    },
    [interactive]
  );

  const handlePointerLeave = useCallback(() => {
    if (!interactive || !slabRef.current) return;
    setIsHovered(false);

    const el = slabRef.current;
    el.style.setProperty('--rot-x', '0deg');
    el.style.setProperty('--rot-y', '0deg');
    el.style.setProperty('--glare-opacity', '0');
  }, [interactive]);

  const handlePointerEnter = useCallback(() => {
    if (!interactive) return;
    setIsHovered(true);
  }, [interactive]);

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
    <div
      className={`card-perspective-wrapper inline-block select-none ${className}`}
      onClick={onClick}
    >
      <div
        ref={slabRef}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{
          transform: 'rotateX(var(--rot-x, 0deg)) rotateY(var(--rot-y, 0deg))',
          boxShadow: isBlackLabel
            ? '0 30px 60px -10px rgba(0,0,0,0.95), 0 0 25px rgba(212,175,55,0.35)'
            : isHovered
            ? '0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 20px rgba(255, 255, 255, 0.2)'
            : '0 20px 45px -10px rgba(0, 0, 0, 0.75)',
        }}
        className={`card-3d-root relative ${slabSizeClasses} ${
          isBlackLabel ? 'slab-acrylic-black-label' : 'slab-acrylic-casing'
        } ${isHovered ? 'is-interacting' : ''} cursor-pointer flex flex-col items-center`}
      >
        {/* Physical Beveled Glass Reflection Rim */}
        <div className="slab-bevel-edge" />

        {/* 4 Sonic-Welded Corner Rivets */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner" />
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner" />
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-white/30 border border-white/40 shadow-inner" />

        {/* ============================================================
            SLAB HEADER LABEL PLATE
            ============================================================ */}
        <div
          className={`w-full mb-3 rounded-lg border p-2.5 ${headerStyle.plateBg} ${headerStyle.plateBorder} relative overflow-hidden z-30 transition-transform duration-200`}
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

          <div className="relative z-10 flex items-start justify-between gap-2">
            {/* Left: Metadata */}
            <div className="flex-1 min-w-0">
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
            <div className="flex flex-col items-end justify-center shrink-0 min-w-[65px] text-right pl-2 border-l border-black/10">
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
            <div className="mt-2 pt-1.5 border-t border-black/15 flex items-center justify-between text-[9px] font-mono leading-none">
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
            INNER RECESSED CARD WELL
            ============================================================ */}
        <div className="w-full flex justify-center items-center rounded-xl slab-inner-well bg-black/60 p-1 relative z-20 overflow-hidden border border-white/10">
          <div className="transition-transform duration-200 group-hover:scale-[1.01]">
            <CardRenderer
              card={card}
              interactive={false} // Slab itself handles 3D physics
              size={size}
              showMarketValue={showMarketValue}
            />
          </div>
        </div>

        {/* Bottom Bar: Acrylic Refraction Stamp & Multiplier */}
        <div className="w-full mt-2.5 flex items-center justify-between text-[10px] text-zinc-400 px-1 z-30 font-mono">
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

        {/* Acrylic Exterior Specular Glare */}
        <div className="card-specular-glare" />
      </div>
    </div>
  );
};

export default GradingSlab;
