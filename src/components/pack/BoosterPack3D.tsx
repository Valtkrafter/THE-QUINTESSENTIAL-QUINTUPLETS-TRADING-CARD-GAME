'use client';

import React from 'react';
import { motion, MotionStyle } from 'framer-motion';
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
  disableTilt?: boolean;
  children?: React.ReactNode;
}

export interface PackThemeConfig {
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
  metallicType: 'silver_cyan' | 'emerald_gold' | 'amber_copper' | 'violet_starlight' | 'purple_cyan' | 'crimson_obsidian' | 'pearl_gold' | 'prismatic_gold';
}

export const PACK_THEMES: Record<PackId, PackThemeConfig> = {
  test_sheet: {
    name: 'Test-Sheet Pack',
    japaneseTitle: '中間試験 模擬テスト',
    subtitle: 'Free Starter Mock Exam Papers',
    badge: 'FREE • 4H REFRESH',
    primaryColor: '#38BDF8',
    secondaryColor: '#E2E8F0',
    foilGradient: 'from-slate-900 via-sky-950 to-zinc-950',
    accentGlow: 'rgba(56, 189, 248, 0.35)',
    borderClass: 'border-sky-400/60',
    motifIcon: '📝',
    metallicType: 'silver_cyan',
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
    metallicType: 'emerald_gold',
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
    metallicType: 'amber_copper',
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
    metallicType: 'violet_starlight',
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
    metallicType: 'purple_cyan',
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
    metallicType: 'crimson_obsidian',
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
    metallicType: 'pearl_gold',
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
    metallicType: 'prismatic_gold',
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
  disableTilt = false,
  children,
}) => {
  // Universal smooth 3D tilt engine
  const {
    tiltStyle,
    glareStyle,
    isHovered,
    containerProps,
  } = useSmoothTilt({
    maxRotation: 8,
    perspective: 1000,
    disabled: !interactive || disableTilt,
    onHoverChange: (hovered) => {
      if (hovered && !disableTilt) soundEngine.playFoilRustle();
    },
  });

  const theme = PACK_THEMES[packId] ?? PACK_THEMES.kiosk;
  const config = PACKS_CONFIG[packId];
  const isGodPack = packId === 'god_pack' || config?.isGodPack;

  // Heat-Sealed Serrated Crimped Teeth strip (28px height)
  const renderCrimpedSeal = (isTop: boolean) => (
    <div
      className={`h-[28px] w-full shrink-0 relative overflow-hidden flex flex-col justify-between ${
        isTop ? 'border-b border-white/20' : 'border-t border-white/20'
      }`}
      style={{
        background: 'repeating-linear-gradient(90deg, #181820 0px, #363645 3px, #121218 6px)',
      }}
    >
      {/* Embossed pressure rivet ridges */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

      {/* Serrated Zig-Zag foil cut edge */}
      <svg
        className={`w-full h-2.5 shrink-0 ${isTop ? 'rotate-180' : ''} pointer-events-none`}
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
      >
        <path
          d="M0,0 L2,12 L4,0 L6,12 L8,0 L10,12 L12,0 L14,12 L16,0 L18,12 L20,0 L22,12 L24,0 L26,12 L28,0 L30,12 L32,0 L34,12 L36,0 L38,12 L40,0 L42,12 L44,0 L46,12 L48,0 L50,12 L52,0 L54,12 L56,0 L58,12 L60,0 L62,12 L64,0 L66,12 L68,0 L70,12 L72,0 L74,12 L76,0 L78,12 L80,0 L82,12 L84,0 L86,12 L88,0 L90,12 L92,0 L94,12 L96,0 L98,12 L100,0 Z"
          fill="#0c0c12"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );

  // Clamped tear progress (0 to 100)
  const progressPct = Math.max(0, Math.min(100, tearProgress));

  return (
    <div
      className={`card-perspective-wrapper inline-block select-none relative before:absolute before:-inset-4 before:content-[''] cursor-pointer ${className}`}
      onClick={onClick}
      {...(disableTilt ? {} : containerProps)}
    >
      <motion.div
        style={{
          ...(disableTilt ? {} : tiltStyle),
          boxShadow: isHovered
            ? `0 30px 60px -10px rgba(0, 0, 0, 0.9), 0 0 35px ${theme.accentGlow}`
            : `0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 15px ${theme.accentGlow}66`,
        }}
        className={`card-3d-root relative w-[300px] sm:w-[320px] h-[480px] sm:h-[520px] max-w-[90vw] max-h-[72vh] aspect-[1/1.625] rounded-3xl overflow-hidden flex flex-col justify-between ${
          isFloating && !isHovered ? 'animate-bounce' : ''
        } ${isHovered && !disableTilt ? 'is-interacting' : ''} ${theme.borderClass} border bg-[#09090f] shadow-2xl`}
      >
        {/* ============================================================
            1. TOP HEAT-SEALED CRIMP (28px)
            ============================================================ */}
        <div className="z-30 bg-[#16161f] shadow-md">
          {renderCrimpedSeal(true)}
        </div>

        {/* ============================================================
            2. PERFORATION SEAM & DYNAMIC FOIL TEAR BREACH (Top ~15%)
            ============================================================ */}
        <div className="relative z-30 w-full">
          {/* Perforation dashed notch line */}
          <div className="h-6 w-full px-3 flex items-center justify-between border-b border-dashed border-white/30 bg-black/40 backdrop-blur-sm relative overflow-hidden">
            {/* Dynamic Tear Beam Glow that widens as drag progresses */}
            {progressPct > 0 && (
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 shadow-[0_0_20px_#f59e0b] opacity-90 transition-all duration-75 pointer-events-none"
                style={{ width: `${progressPct}%` }}
              />
            )}

            <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-zinc-300 uppercase z-10">
              <span className={`w-1.5 h-1.5 rounded-full ${progressPct > 0 ? 'bg-amber-300 animate-ping' : 'bg-amber-400'}`} />
              <span>PERFORATION SEAM</span>
            </div>

            <span className="text-[10px] text-amber-300 font-bold tracking-widest font-mono z-10">
              {isTorn ? '★ OPENED' : progressPct > 0 ? `${Math.round(progressPct)}%` : 'PULL TO TEAR ▶'}
            </span>
          </div>

          {/* Direct Tear Tab Mount Location */}
          {children}
        </div>

        {/* ============================================================
            3. PACK BODY: FOIL GRAPHICS & AUTHENTIC TQQ BRANDING
            ============================================================ */}
        <div
          className={`relative flex-1 p-5 flex flex-col justify-between bg-gradient-to-b ${theme.foilGradient} overflow-hidden`}
        >
          {/* Iridescent Metallic Foil Reflection */}
          <div
            className="absolute inset-0 opacity-45 pointer-events-none mix-blend-color-dodge"
            style={{
              background: `linear-gradient(135deg, transparent 15%, ${theme.primaryColor} 45%, #ffffff 50%, ${theme.secondaryColor} 55%, transparent 85%)`,
              backgroundSize: '250% 250%',
              backgroundPosition: 'calc(var(--glare-x, 50%) * 2) calc(var(--glare-y, 50%) * 2)',
            }}
          />

          {/* Micro-Holographic Foil Grid */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 7px)',
            }}
          />

          {/* Central Cylindrical Pack Puff Reflection */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-44 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

          {/* SET HEADER: Authentic Japanese Logo Typography & Badge */}
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] tracking-widest font-black uppercase text-amber-400 drop-shadow font-mono">
                TQQ VAULT EXPANSE SET 01
              </span>
              <div className="text-[11px] text-white font-serif tracking-wider font-bold drop-shadow">
                五等分の花嫁
              </div>
            </div>

            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-md font-mono"
              style={{
                backgroundColor: `${theme.primaryColor}25`,
                borderColor: theme.primaryColor,
                color: theme.primaryColor,
              }}
            >
              {theme.badge}
            </span>
          </div>

          {/* CENTER ARTWORK: Embossed Motif Icon & Tier Titles */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
            {/* Foil Motif Emblem */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-3 shadow-2xl border border-white/35 backdrop-blur-sm"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${theme.primaryColor}99, #09090b)`,
                boxShadow: `0 0 35px ${theme.accentGlow}`,
              }}
            >
              <span className="text-4xl sm:text-5xl filter drop-shadow-xl select-none">
                {theme.motifIcon}
              </span>
            </div>

            <span className="text-xs font-serif tracking-widest text-zinc-200 mb-1 opacity-90 drop-shadow">
              {theme.japaneseTitle}
            </span>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
              {theme.name}
            </h2>

            <p className="text-[11px] text-zinc-300 mt-1 max-w-[220px] font-medium leading-tight drop-shadow">
              {theme.subtitle}
            </p>
          </div>

          {/* FOOTER: Nakano Sister Icons & Card Count */}
          <div className="relative z-10 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] text-zinc-300">
            <div className="flex items-center gap-1.5 text-sm">
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

        {/* ============================================================
            4. BOTTOM HEAT-SEALED CRIMP (28px)
            ============================================================ */}
        <div className="z-30 bg-[#16161f] shadow-md">
          {renderCrimpedSeal(false)}
        </div>

        {/* Specular Laminate Reflection Overlay */}
        <motion.div className="card-specular-glare pointer-events-none" style={glareStyle} />

        {/* God Pack Divine Volumetric Rays */}
        {isGodPack && (
          <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-55 bg-[radial-gradient(circle,rgba(255,215,0,0.85)_0%,transparent_70%)] animate-pulse" />
        )}
      </motion.div>
    </div>
  );
};

export default BoosterPack3D;
