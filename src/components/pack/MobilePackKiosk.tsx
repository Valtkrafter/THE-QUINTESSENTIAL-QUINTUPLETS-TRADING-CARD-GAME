'use client';

import React, { useState, useEffect } from 'react';
import { PackId, Rarity } from '../../types/card';
import { PACKS_CONFIG } from '../../config/economy';
import { PACK_THEMES } from './BoosterPack3D';
import { useGameStore } from '../../store/useGameStore';
import { SinglesMarket } from '../market/SinglesMarket';
import { soundEngine } from '../../utils/audioEngine';
import { hapticLightTap } from '../../utils/haptics';
import {
  PackageOpen,
  Store,
  Sparkles,
  Clock,
  Zap,
  Info,
  CheckCircle2,
} from 'lucide-react';

export interface MobilePackKioskProps {
  onSelectPack: (packId: PackId) => void;
  onViewOdds?: (packId: PackId) => void;
}

const ALL_PACK_IDS: PackId[] = [
  'test_sheet',
  'kiosk',
  'lernsession',
  'sommerfeuerwerk',
  'schulfest',
  'klassenfahrt_kyoto',
  'braut_schicksal',
  'god_pack',
];

export const MobilePackKiosk: React.FC<MobilePackKioskProps> = ({
  onSelectPack,
  onViewOdds,
}) => {
  const [activeTab, setActiveTab] = useState<'packs' | 'kiosk'>('packs');

  const yen = useGameStore((state) => state.yen);
  const getCooldownRemaining = useGameStore((state) => state.getTestSheetCooldownRemaining);

  const [testSheetCooldown, setTestSheetCooldown] = useState(0);

  useEffect(() => {
    setTestSheetCooldown(getCooldownRemaining());
    const interval = setInterval(() => {
      setTestSheetCooldown(getCooldownRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [getCooldownRemaining]);

  const formatCd = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h.toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden select-none pb-20">
      {/* KIOSK SUB-HEADER TABS */}
      <div className="h-13 shrink-0 border-b border-white/10 px-3 flex items-center justify-between bg-[#0c0c12]/90 backdrop-blur-md">
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/10 p-1 rounded-xl font-mono text-xs">
          <button
            onClick={() => {
              hapticLightTap();
              setActiveTab('packs');
            }}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'packs'
                ? 'bg-amber-500 text-black font-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PackageOpen className="w-3.5 h-3.5" />
            <span>Booster Packs</span>
          </button>
          <button
            onClick={() => {
              hapticLightTap();
              setActiveTab('kiosk');
            }}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'kiosk'
                ? 'bg-amber-500 text-black font-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Singles Kiosk</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-zinc-400">
          Balance: <strong className="text-amber-400 font-black">{yen.toLocaleString()} ¥</strong>
        </span>
      </div>

      {/* BOOSTER PACKS TAB */}
      {activeTab === 'packs' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {ALL_PACK_IDS.map((pId) => {
            const config = PACKS_CONFIG[pId];
            const theme = PACK_THEMES[pId];
            if (!config || !theme) return null;

            const isFree = config.costYen === 0;
            const isOnCooldown = isFree && testSheetCooldown > 0;
            const canAfford = isFree ? !isOnCooldown : yen >= config.costYen;

            return (
              <div
                key={pId}
                className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-between gap-3 shadow-md hover:border-white/20 transition"
              >
                {/* Left Pack Badge & Info */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-16 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-lg border border-white/20"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primaryColor}80, #0a0a14)`,
                    }}
                  >
                    <span>{theme.motifIcon}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-white">{theme.name}</h4>
                      <span
                        className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border"
                        style={{
                          backgroundColor: `${theme.primaryColor}20`,
                          borderColor: theme.primaryColor,
                          color: theme.primaryColor,
                        }}
                      >
                        {theme.badge}
                      </span>
                    </div>

                    <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                      {config.description}
                    </p>

                    <div className="text-[10px] font-mono mt-1 flex items-center gap-2">
                      <span className="text-zinc-500">{config.slots} Cards</span>
                      <span className="text-amber-400 font-bold">
                        {isFree ? (
                          isOnCooldown ? (
                            <span className="text-zinc-500">Cooldown: {formatCd(testSheetCooldown)}</span>
                          ) : (
                            'FREE'
                          )
                        ) : (
                          `${config.costYen.toLocaleString()} ¥`
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Button */}
                <button
                  onClick={() => {
                    hapticLightTap();
                    onSelectPack(pId);
                  }}
                  disabled={!canAfford}
                  className={`px-4 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition active:scale-95 shrink-0 shadow-md ${
                    canAfford
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-amber-500/20'
                      : 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {isFree && isOnCooldown ? 'Locked' : 'Open'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* SINGLES KIOSK TAB */}
      {activeTab === 'kiosk' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 no-scrollbar">
          <SinglesMarket />
        </div>
      )}
    </div>
  );
};

export default MobilePackKiosk;
