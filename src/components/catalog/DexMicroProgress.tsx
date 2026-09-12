'use client';

import React from 'react';
import { Crown } from 'lucide-react';

export interface DexMicroProgressProps {
  collected: number;
  total: number;
  className?: string;
}

export const DexMicroProgress: React.FC<DexMicroProgressProps> = ({
  collected,
  total,
  className = '',
}) => {
  const percentage = total > 0 ? Math.round((collected / total) * 100) : 0;
  const isComplete = collected >= total && total > 0;

  // Streamlined micro-ring SVG math (calibrated for 32x32 / 36x36 viewports)
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`group relative flex items-center shrink-0 cursor-pointer select-none ${className}`}
      title={`Master Card-Dex: ${collected} of ${total} Artworks Collected (${percentage}%)`}
    >
      <div className="relative w-8 h-8 md:w-9 md:h-9 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 32 32">
          {/* Background track */}
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-zinc-800/90"
            fill="transparent"
          />
          {/* Active progress arc */}
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke="currentColor"
            strokeWidth="2.5"
            className={isComplete ? 'text-amber-400' : 'text-amber-400/90'}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>

        {/* Center percentage display */}
        <div className="absolute inset-0 flex items-center justify-center font-mono">
          {isComplete ? (
            <Crown className="w-3.5 h-3.5 text-amber-300 drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]" />
          ) : (
            <span className="text-[10px] font-bold text-amber-300 tracking-tighter">
              {percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Floating tooltip on hover */}
      <div className="absolute left-1/2 -bottom-9 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-lg bg-zinc-950/95 border border-white/15 text-[11px] font-mono text-zinc-200 shadow-xl shadow-black/80">
        Master Card-Dex: <span className="font-bold text-amber-300">{collected} of {total}</span> Artworks Collected
      </div>
    </div>
  );
};

export default DexMicroProgress;
