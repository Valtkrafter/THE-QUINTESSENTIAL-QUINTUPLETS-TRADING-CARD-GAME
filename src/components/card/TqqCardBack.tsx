'use client';

import React from 'react';

export interface TqqCardBackProps {
  className?: string;
  showSheen?: boolean;
}

/**
 * TqqCardBack - Official High-Resolution TQQ Vault Collectible Card Back
 *
 * Designed with authentic Bushiroad / Weiss Schwarz & Japanese TCG aesthetics:
 * - Deep velvet midnight obsidian substrate (#08090f)
 * - 24K Gold foil embossed filigree borders and corner ornaments
 * - Concentric guilloché sacred geometry rosette
 * - Nakano Sisters 5-colored crest petals (Amber, Magenta, Cyan, Emerald, Ruby)
 * - Embossed gold calligraphy: 五等分の花嫁 & The Quintessential Quintuplets
 * - Glossy protective clear-coat specular sheen
 */
export const TqqCardBack: React.FC<TqqCardBackProps> = ({
  className = '',
  showSheen = true,
}) => {
  return (
    <div
      className={`relative w-full h-full aspect-[63/88] rounded-2xl md:rounded-[18px] overflow-hidden select-none bg-[#08090f] shadow-2xl border border-amber-500/30 ${className}`}
      style={{
        boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.9), 0 10px 30px rgba(0, 0, 0, 0.8)',
      }}
    >
      {/* 1. Deep Velvet Micro-Texture Base */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, #1e1b4b 0%, #08090f 80%)`,
        }}
      />

      {/* 2. Micro Guilloché Diagonal Lattice */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.2) 0px, rgba(245, 158, 11, 0.2) 1px, transparent 1px, transparent 10px),
            repeating-linear-gradient(-45deg, rgba(245, 158, 11, 0.2) 0px, rgba(245, 158, 11, 0.2) 1px, transparent 1px, transparent 10px)`,
        }}
      />

      {/* 3. Outer Gold Foil Border Frame */}
      <div className="absolute inset-2 md:inset-2.5 rounded-xl border-2 border-[#d4af37] pointer-events-none flex flex-col justify-between p-2">
        {/* Inner Filigree Hairline Border */}
        <div className="absolute inset-1 rounded-lg border border-amber-400/40 pointer-events-none" />

        {/* Corner Ornaments */}
        <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-amber-300" />
        <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-amber-300" />
        <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-amber-300" />
        <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-amber-300" />

        {/* Top Header Bar */}
        <div className="relative z-10 text-center pt-2">
          <div className="text-[7px] md:text-[8px] font-mono tracking-[0.25em] text-amber-300 uppercase font-black drop-shadow">
            ★ THE QUINTESSENTIAL QUINTUPLETS ★
          </div>
          <div className="text-[6px] tracking-widest text-zinc-400 uppercase font-semibold">
            TRADING CARD GAME
          </div>
        </div>

        {/* Central Sacred Rosette & 5-Sister Floral Crest */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-1">
          {/* Concentric Guilloché SVG Rings */}
          <div className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center">
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 w-full h-full text-amber-500/35"
              fill="none"
              stroke="currentColor"
            >
              {/* Outer Decorative Gear Ring */}
              <circle
                cx="100"
                cy="100"
                r="92"
                strokeWidth="1"
                strokeDasharray="4 2"
                stroke="url(#goldLuster)"
              />
              <circle
                cx="100"
                cy="100"
                r="84"
                strokeWidth="1.5"
                stroke="url(#goldLuster)"
              />
              <circle
                cx="100"
                cy="100"
                r="72"
                strokeWidth="0.75"
                strokeDasharray="3 3"
              />

              {/* 5-Axis Star Lines */}
              <polygon
                points="100,15 178,72 148,165 52,165 22,72"
                strokeWidth="0.8"
                stroke="#d4af37"
                opacity="0.6"
              />
              <polygon
                points="100,25 168,75 142,155 58,155 32,75"
                strokeWidth="0.6"
                stroke="#f59e0b"
                opacity="0.4"
              />

              {/* Central Sunburst Rays */}
              {[...Array(20)].map((_, idx) => (
                <line
                  key={idx}
                  x1="100"
                  y1="100"
                  x2={100 + 60 * Math.cos((idx * 18 * Math.PI) / 180)}
                  y2={100 + 60 * Math.sin((idx * 18 * Math.PI) / 180)}
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              ))}

              <defs>
                <linearGradient id="goldLuster" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#bf953f" />
                  <stop offset="25%" stopColor="#fcf6ba" />
                  <stop offset="50%" stopColor="#b38728" />
                  <stop offset="75%" stopColor="#fbf5b7" />
                  <stop offset="100%" stopColor="#aa771c" />
                </linearGradient>
              </defs>
            </svg>

            {/* 5 Nakano Sister Gem Nodes */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Ichika (Yellow) - Top Center (0 deg) */}
              <div
                className="absolute w-4 h-4 rounded-full border border-amber-300 shadow-[0_0_10px_#f59e0b] bg-gradient-to-br from-amber-300 to-amber-600"
                style={{ transform: 'translate(0px, -52px)' }}
                title="Ichika"
              />
              {/* Nino (Magenta) - Top Right (72 deg) */}
              <div
                className="absolute w-4 h-4 rounded-full border border-pink-300 shadow-[0_0_10px_#ec4899] bg-gradient-to-br from-pink-400 to-rose-600"
                style={{ transform: 'translate(49px, -16px)' }}
                title="Nino"
              />
              {/* Miku (Cyan) - Bottom Right (144 deg) */}
              <div
                className="absolute w-4 h-4 rounded-full border border-cyan-300 shadow-[0_0_10px_#06b6d4] bg-gradient-to-br from-cyan-300 to-blue-600"
                style={{ transform: 'translate(30px, 42px)' }}
                title="Miku"
              />
              {/* Yotsuba (Emerald) - Bottom Left (216 deg) */}
              <div
                className="absolute w-4 h-4 rounded-full border border-emerald-300 shadow-[0_0_10px_#10b981] bg-gradient-to-br from-emerald-300 to-green-600"
                style={{ transform: 'translate(-30px, 42px)' }}
                title="Yotsuba"
              />
              {/* Itsuki (Ruby) - Top Left (288 deg) */}
              <div
                className="absolute w-4 h-4 rounded-full border border-rose-300 shadow-[0_0_10px_#ef4444] bg-gradient-to-br from-rose-400 to-red-700"
                style={{ transform: 'translate(-49px, -16px)' }}
                title="Itsuki"
              />

              {/* Central Gold Crest Medallion */}
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#d4af37] via-[#f7e692] to-[#aa771c] p-0.5 shadow-[0_0_20px_rgba(212,175,55,0.7)] flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#0c0d16] flex flex-col items-center justify-center border border-amber-400/50">
                  <span className="text-[13px] md:text-sm font-serif font-black text-amber-300 drop-shadow">
                    五
                  </span>
                  <span className="text-[6px] tracking-tighter text-amber-200/90 font-mono -mt-1 font-bold">
                    TQQ
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Japanese Franchise Title Stamping */}
          <div className="mt-2 text-center">
            <div
              className="text-[10px] md:text-[11px] font-serif font-black tracking-widest text-transparent bg-clip-text drop-shadow"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, #bf953f 0%, #fcf6ba 40%, #b38728 70%, #aa771c 100%)',
              }}
            >
              五等分の花嫁
            </div>
            <div className="text-[7px] text-amber-200/80 font-mono tracking-widest uppercase">
              TQQ VAULT EXPANSE
            </div>
          </div>
        </div>

        {/* Bottom Footer Bar */}
        <div className="relative z-10 text-center pb-2 border-t border-amber-500/30 pt-1.5 flex items-center justify-between px-2 text-[6px] md:text-[7px] font-mono text-zinc-400 uppercase">
          <span>KODANSHA / TQQ</span>
          <span className="text-amber-400 font-bold tracking-widest">★ 5 SISTERS ★</span>
          <span>MADE IN JAPAN</span>
        </div>
      </div>

      {/* 4. Glossy Specular Surface Reflection */}
      {showSheen && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.15) 100%)',
          }}
        />
      )}
    </div>
  );
};
