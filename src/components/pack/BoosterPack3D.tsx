'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PackId } from '../../types/card';
import { PACKS_CONFIG } from '../../config/economy';
import { soundEngine } from '../../utils/audioEngine';
import { useSmoothTilt } from '../../hooks/useSmoothTilt';

export interface BoosterPack3DProps {
  packId: PackId;
  interactive?: boolean;
  isFloating?: boolean;
  className?: string;
  onClick?: () => void;
  isTorn?: boolean;
  tearProgress?: number; // 0 to 100
}

interface PackThemeConfig {
  name: string;
  japaneseTitle: string;
  subtitle: string;
  badge: string;
  primaryColor: string;
  secondaryColor: string;
  foilGradient: string;
  accentGlow: string;
  borderClass: string;
  motifIcon: string;
}

export const PACK_THEMES: Record<PackId, PackThemeConfig> = {
  test_sheet: {
    name: 'Test-Sheet Pack',
    japaneseTitle: '中間試験 模擬テスト',
    subtitle: 'Free Starter Mock Exam Papers',
    badge: 'FREE • 4H COOLDOWN',
    primaryColor: '#38BDF8',
    secondaryColor: '#E2E8F0',
    foilGradient: 'from-slate-900 via-sky-950 to-zinc-950',
    accentGlow: 'rgba(56, 189, 248, 0.35)',
    borderClass: 'border-sky-400/60',
    motifIcon: '📝',
  },
  kiosk: {
    name: 'Kiosk-Pack',
    japaneseTitle: '購買部 スナックパック',
    subtitle: 'Corner Convenience Store Booster',
    badge: '100 ¥',
    primaryColor: '#10B981',
    secondaryColor: '#F59E0B',
    foilGradient: 'from-emerald-950 via-teal-900 to-zinc-950',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    borderClass: 'border-emerald-400/60',
    motifIcon: '🏪',
  },
  lernsession: {
    name: 'Lernsession-Pack',
    japaneseTitle: '放課後 勉強会パック',
    subtitle: 'After-School Study Booster (SR+)',
    badge: '500 ¥',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    foilGradient: 'from-amber-950 via-orange-950 to-zinc-950',
    accentGlow: 'rgba(245, 158, 11, 0.45)',
    borderClass: 'border-amber-400/70',
    motifIcon: '📚',
  },
  sommerfeuerwerk: {
    name: 'Sommerfeuerwerk',
    japaneseTitle: '夏祭り 花火大会パック',
    subtitle: 'Summer Fireworks Festival (UR+)',
    badge: '2,500 ¥',
    primaryColor: '#EC4899',
    secondaryColor: '#8B5CF6',
    foilGradient: 'from-pink-950 via-indigo-950 to-zinc-950',
    accentGlow: 'rgba(236, 72, 153, 0.5)',
    borderClass: 'border-pink-400/70',
    motifIcon: '🎆',
  },
  schulfest: {
    name: 'Schulfest-Pack',
    japaneseTitle: '旭高校 文化祭パック',
    subtitle: 'Culture Festival Gala (SEC+)',
    badge: '12,000 ¥',
    primaryColor: '#8B5CF6',
    secondaryColor: '#06B6D4',
    foilGradient: 'from-purple-950 via-fuchsia-950 to-zinc-950',
    accentGlow: 'rgba(139, 92, 246, 0.55)',
    borderClass: 'border-purple-400/80',
    motifIcon: '🎭',
  },
  klassenfahrt_kyoto: {
    name: 'Klassenfahrt-Kyoto',
    japaneseTitle: '修学旅行 京都伝説',
    subtitle: 'Kyoto Trip Imperial (MR+)',
    badge: '60,000 ¥',
    primaryColor: '#EF4444',
    secondaryColor: '#D97706',
    foilGradient: 'from-red-950 via-rose-950 to-black',
    accentGlow: 'rgba(239, 68, 68, 0.6)',
    borderClass: 'border-red-400/80',
    motifIcon: '⛩️',
  },
  braut_schicksal: {
    name: 'Braut-Schicksal',
    japaneseTitle: '五等分の花嫁 運命の誓い',
    subtitle: 'Pinnacle Bridal Destiny Pack',
    badge: '300,000 ¥',
    primaryColor: '#FDE047',
    secondaryColor: '#FFFFFF',
    foilGradient: 'from-zinc-900 via-amber-950/80 to-black',
    accentGlow: 'rgba(253, 224, 71, 0.7)',
    borderClass: 'border-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.5)]',
    motifIcon: '💍',
  },
  god_pack: {
    name: 'God Pack',
    japaneseTitle: '神話降臨 ゴッドパック',
    subtitle: 'Hidden 0.05% Celestial Miracle',
    badge: '★ GOD PACK ★',
    primaryColor: '#FCD34D',
    secondaryColor: '#EC4899',
    foilGradient: 'from-amber-600 via-yellow-400 to-amber-600',
    accentGlow: 'rgba(252, 211, 77, 0.9)',
    borderClass: 'border-yellow-200 shadow-[0_0_30px_rgba(252,211,77,0.8)]',
    motifIcon: '👑',
  },
};

export const BoosterPack3D: React.FC<BoosterPack3DProps> = ({
  packId,
  interactive = true,
  isFloating = true,
  className = '',
  onClick,
  isTorn = false,
  tearProgress = 0,
}) => {
  // Universal smooth 3D tilt engine with derived light vector dynamics
  const {
    tiltStyle,
    glareStyle,
    isHovered,
    containerProps,
  } = useSmoothTilt({
    maxRotation: 10,
    perspective: 1200,
    disabled: !interactive,
    onHoverChange: (hovered) => {
      if (hovered) soundEngine.playFoilRustle();
    },
  });

  const theme = PACK_THEMES[packId] ?? PACK_THEMES.kiosk;
  const config = PACKS_CONFIG[packId];
  const isGodPack = packId === 'god_pack' || config?.isGodPack;

  // Crimped zig-zag foil teeth SVG
  const renderCrimpedEdge = (isTop: boolean) => (
    <svg
      className={`w-full h-3 shrink-0 ${isTop ? 'rotate-180' : ''} pointer-events-none`}
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
    >
      <path
        d="M0,0 L2.5,12 L5,0 L7.5,12 L10,0 L12.5,12 L15,0 L17.5,12 L20,0 L22.5,12 L25,0 L27.5,12 L30,0 L32.5,12 L35,0 L37.5,12 L40,0 L42.5,12 L45,0 L47.5,12 L50,0 L52.5,12 L55,0 L57.5,12 L60,0 L62.5,12 L65,0 L67.5,12 L70,0 L72.5,12 L75,0 L77.5,12 L80,0 L82.5,12 L85,0 L87.5,12 L90,0 L92.5,12 L95,0 L97.5,12 L100,0 Z"
        fill="#18181b"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.5"
      />
    </svg>
  );

  return (
    <div
      className={`card-perspective-wrapper inline-block select-none relative before:absolute before:-inset-4 before:content-[''] cursor-pointer ${className}`}
      onClick={onClick}
      {...containerProps}
    >
      <motion.div
        style={{
          ...tiltStyle,
          boxShadow: isHovered
            ? `0 30px 60px -10px rgba(0, 0, 0, 0.9), 0 0 35px ${theme.accentGlow}`
            : `0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 15px ${theme.accentGlow}66`,
        }}
        className={`card-3d-root relative w-[290px] sm:w-[320px] h-[440px] sm:h-[480px] rounded-2xl overflow-hidden flex flex-col justify-between ${
          isFloating && !isHovered ? 'animate-bounce' : ''
        } ${isHovered ? 'is-interacting' : ''} ${theme.borderClass} border bg-zinc-950`}
      >
        {/* Top Crimped Foil Edge */}
        <div className="z-30 bg-zinc-900 border-b border-white/10 shadow-md">
          {renderCrimpedEdge(true)}
        </div>

        {/* Top 15% Tear Zone Indicator */}
        <div
          className="relative z-30 px-3 py-1.5 flex items-center justify-between border-b border-dashed border-white/30 bg-black/40 backdrop-blur-sm transition-all"
          style={{
            transform: `translateX(${tearProgress * 0.4}px)`,
          }}
        >
          <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-zinc-400 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>PULL STRIP</span>
          </div>

          <span className="text-[10px] text-amber-400 font-bold tracking-widest font-mono">
            {tearProgress > 0 ? `${Math.round(tearProgress)}% TEAR` : 'SLIDE TO TEAR ➔'}
          </span>
        </div>

        {/* ============================================================
            PACK BODY: FOIL GRAPHICS & THEME
            ============================================================ */}
        <div
          className={`relative flex-1 p-5 flex flex-col justify-between bg-gradient-to-b ${theme.foilGradient} overflow-hidden`}
        >
          {/* Iridescent Foil Metallic Reflection */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none mix-blend-color-dodge"
            style={{
              background: `linear-gradient(135deg, transparent 20%, ${theme.primaryColor} 45%, #ffffff 50%, ${theme.secondaryColor} 55%, transparent 80%)`,
              backgroundSize: '250% 250%',
              backgroundPosition: 'calc(var(--glare-x, 50%) * 2) calc(var(--glare-y, 50%) * 2)',
            }}
          />

          {/* Hologram Diagonal Foil Micro-Lines */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 1px, transparent 1px, transparent 6px)',
            }}
          />

          {/* Central Cylindrical Puff Highlight */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-48 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

          {/* HEADER: Pack Badge & Official Logo */}
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] tracking-widest font-black uppercase text-amber-400 drop-shadow">
                TQQ VAULT
              </span>
              <div className="text-[9px] text-zinc-300 font-serif tracking-wider">
                五等分の花嫁
              </div>
            </div>

            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-md"
              style={{
                backgroundColor: `${theme.primaryColor}22`,
                borderColor: theme.primaryColor,
                color: theme.primaryColor,
              }}
            >
              {theme.badge}
            </span>
          </div>

          {/* CENTER ARTWORK: Motif & Titles */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
            {/* Center Motif Icon */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-3 shadow-2xl border border-white/30 backdrop-blur-sm"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${theme.primaryColor}88, #09090b)`,
                boxShadow: `0 0 30px ${theme.accentGlow}`,
              }}
            >
              <span className="text-4xl sm:text-5xl filter drop-shadow-lg">
                {theme.motifIcon}
              </span>
            </div>

            <span className="text-xs font-serif tracking-widest text-zinc-300 mb-1 opacity-90 drop-shadow">
              {theme.japaneseTitle}
            </span>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
              {theme.name}
            </h2>

            <p className="text-[11px] text-zinc-300 mt-1 max-w-[220px] font-medium leading-tight">
              {theme.subtitle}
            </p>
          </div>

          {/* FOOTER: Sister Symbols & Guarantee */}
          <div className="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-zinc-300">
            <div className="flex items-center gap-1 text-sm">
              <span title="Ichika">💛</span>
              <span title="Nino">🦋</span>
              <span title="Miku">🎧</span>
              <span title="Yotsuba">🍀</span>
              <span title="Itsuki">⭐</span>
            </div>

            <div className="font-mono text-[9px] uppercase tracking-wider text-amber-400 font-bold">
              {config?.slots ?? 5} CARDS PER PACK
            </div>
          </div>
        </div>

        {/* Bottom Crimped Foil Edge */}
        <div className="z-30 bg-zinc-900 border-t border-white/10 shadow-md">
          {renderCrimpedEdge(false)}
        </div>

        {/* Specular Laminate Reflection Overlay */}
        <motion.div className="card-specular-glare pointer-events-none" style={glareStyle} />

        {/* God Pack Divine Rays */}
        {isGodPack && (
          <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-50 bg-[radial-gradient(circle,rgba(255,215,0,0.8)_0%,transparent_70%)] animate-pulse" />
        )}
      </motion.div>
    </div>
  );
};

export default BoosterPack3D;
