'use client';

import React, { useState, useMemo } from 'react';
import { CardInstance, CharacterId } from '../../types/card';
import { useGameStore } from '../../store/useGameStore';
import { useIdleRevenue } from '../../hooks/useIdleRevenue';
import { calculateCardMarketValue } from '../../config/economy';
import { GradingSlab } from '../card/GradingSlab';
import { CardRenderer } from '../card/CardRenderer';
import { SupportAltar } from './SupportAltar';
import { SupportDrawer } from './SupportDrawer';
import { SocketDrawer } from './SocketDrawer';
import { VitrineResonancePanel } from './VitrineResonancePanel';
import { VitrineHarvestConsole } from './VitrineHarvestConsole';
import { soundEngine } from '../../utils/audioEngine';
import { Plus } from 'lucide-react';

// Signature spotlight colors per sister and support
export const SPOTLIGHT_COLORS: Record<string, { hex: string; rgb: string; glow: string }> = {
  ichika: { hex: '#F59E0B', rgb: '245, 158, 11', glow: 'rgba(245, 158, 11, 0.4)' },
  nino: { hex: '#EC4899', rgb: '236, 72, 153', glow: 'rgba(236, 72, 153, 0.4)' },
  miku: { hex: '#06B6D4', rgb: '6, 182, 212', glow: 'rgba(6, 182, 212, 0.4)' },
  yotsuba: { hex: '#10B981', rgb: '16, 185, 129', glow: 'rgba(16, 185, 129, 0.4)' },
  itsuki: { hex: '#EF4444', rgb: '239, 68, 68', glow: 'rgba(239, 68, 68, 0.4)' },
  support: { hex: '#8B5CF6', rgb: '139, 92, 246', glow: 'rgba(139, 92, 246, 0.4)' },
  empty: { hex: '#475569', rgb: '71, 85, 105', glow: 'rgba(71, 85, 105, 0.15)' },
};

// 3D semi-circle pedestal stage configurations (angles & depth, 1:1 native pixel rendering)
const PEDESTAL_CONFIGS = [
  { index: 0, rotateY: 20, translateZ: -30, translateX: -12 },
  { index: 1, rotateY: 10, translateZ: -10, translateX: -4 },
  { index: 2, rotateY: 0, translateZ: 20, translateX: 0 }, // Center Hero
  { index: 3, rotateY: -10, translateZ: -10, translateX: 4 },
  { index: 4, rotateY: -20, translateZ: -30, translateX: 12 },
];

export const Vitrine: React.FC = () => {
  const inventory = useGameStore((state) => state.inventory);
  const showcaseSlots = useGameStore((state) => state.showcaseSlots);
  const slotShowcaseCard = useGameStore((state) => state.slotShowcaseCard);

  // High-performance idle revenue hook with 12h offline protection
  const {
    accruedYen,
    yieldPerMinute,
    yieldPerSecond,
    synergyReport,
    isMaxOfflineReached,
    claimRevenue,
  } = useIdleRevenue();

  // Socketing Drawer State
  const [selectedPedestalIndex, setSelectedPedestalIndex] = useState<number | null>(null);

  // Support Altar Drawer State
  const [isSupportDrawerOpen, setIsSupportDrawerOpen] = useState<boolean>(false);

  // Claim celebration animation state
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  // Map of slotted cards for fast resolution
  const inventoryMap = useMemo(() => {
    const map = new Map<string, CardInstance>();
    for (const card of inventory) {
      map.set(card.id, card);
    }
    return map;
  }, [inventory]);

  const slottedCards = useMemo(() => {
    return showcaseSlots.map((slot) => {
      return slot.cardInstanceId ? inventoryMap.get(slot.cardInstanceId) ?? null : null;
    });
  }, [showcaseSlots, inventoryMap]);

  // Handle Unmount Card
  const handleUnmountCard = (slotIndex: number) => {
    try {
      slotShowcaseCard(slotIndex, null);
      soundEngine.playFoilRustle();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Handle Claim Vault Revenue
  const handleClaimRevenue = () => {
    if (accruedYen <= 0 || isClaiming) return;
    setIsClaiming(true);

    claimRevenue();

    setTimeout(() => {
      setIsClaiming(false);
    }, 1600);
  };

  return (
    <div className="relative w-full h-full bg-[#08080a] text-zinc-100 flex flex-col select-none overflow-hidden font-sans">
      {/* ============================================================
          MAIN 3D SEMI-CIRCULAR VITRINE STAGE & FLANK HUD
          ============================================================ */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-start pt-2 sm:pt-4 px-4 sm:px-8 pb-10 overflow-y-auto overflow-x-hidden pointer-events-none">
        {/* Atmospheric background spotlights & ceiling rig */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 via-zinc-950/40 to-transparent pointer-events-none select-none z-10" />

        {/* Vitrine Obsidian Floor Grid & Ambient Reflection */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black via-[#0c0c12] to-transparent pointer-events-none select-none" />
        <div className="absolute bottom-10 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none select-none" />

        {/* ============================================================
            UPPER STAGE ZONE: LEFT FLANK | SUPPORT ALTAR | RIGHT FLANK
            ============================================================ */}
        <div className="w-full max-w-7xl mx-auto px-4 pt-2 pb-2 sm:pb-4 flex flex-col lg:flex-row items-center justify-between gap-6 relative z-30 pointer-events-auto">
          {/* Left Flank Panel: Vault Valuation & Resonance Synergies */}
          <VitrineResonancePanel synergyReport={synergyReport} />

          {/* Central Support Altar / Tutor Dais */}
          <SupportAltar onOpenDrawer={() => setIsSupportDrawerOpen(true)} />

          {/* Right Flank Panel: Yield Generator & Harvest Console */}
          <VitrineHarvestConsole
            accruedYen={accruedYen}
            yieldPerMinute={yieldPerMinute}
            yieldPerSecond={yieldPerSecond}
            isMaxOfflineReached={isMaxOfflineReached}
            onClaim={handleClaimRevenue}
            isClaiming={isClaiming}
          />
        </div>

        {/* ============================================================
            LOWER STAGE ZONE: 3D SEMI-CIRCULAR 5 SISTER PEDESTALS
            ============================================================ */}
        <div
          className="relative w-full max-w-7xl h-[460px] md:h-[500px] lg:h-[520px] mt-6 md:mt-8 mb-8 pb-10 flex items-center justify-center pointer-events-none select-none"
          style={{
            perspective: 1200,
            perspectiveOrigin: '50% 40%',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="grid grid-cols-5 gap-3 sm:gap-6 w-full h-full items-end justify-items-center pb-4 pointer-events-none select-none">
            {PEDESTAL_CONFIGS.map((config) => {
              const slot = showcaseSlots[config.index];
              const card = slottedCards[config.index];
              const characterId =
                card?.characterId ||
                (config.index < 5
                  ? (['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'][config.index] as CharacterId)
                  : 'support');
              const themeColorKey = card
                ? card.characterId in SPOTLIGHT_COLORS
                  ? card.characterId
                  : 'support'
                : 'empty';
              const spotlight = SPOTLIGHT_COLORS[themeColorKey] ?? SPOTLIGHT_COLORS.empty;

              return (
                <div
                  key={config.index}
                  className="relative flex flex-col items-center justify-end h-full w-[220px] max-w-full transition-transform duration-500 pointer-events-none select-none"
                  style={{
                    transform: `rotateY(${config.rotateY}deg) translateZ(${config.translateZ}px) translateX(${config.translateX}px)`,
                    transformStyle: 'flat',
                  }}
                >
                  {/* Dynamic Overhead Conical Spotlight */}
                  <div
                    className="absolute -top-20 inset-x-0 h-[480px] pointer-events-none select-none transition-all duration-700 opacity-60"
                    style={{
                      background: `conic-gradient(from 180deg at 50% 0%, transparent 65deg, ${spotlight.glow} 85deg, ${spotlight.glow} 95deg, transparent 115deg)`,
                      filter: 'blur(20px)',
                    }}
                  />

                  {/* Ceiling Lamp Fixture */}
                  <div
                    className="w-12 h-2.5 rounded-full border border-white/20 mb-3 z-10 transition-colors duration-700 shadow-lg pointer-events-none select-none"
                    style={{
                      backgroundColor: card ? spotlight.hex : '#27272a',
                      boxShadow: card ? `0 0 15px ${spotlight.hex}` : 'none',
                    }}
                  />

                  {/* Pedestal Card Mount Slot */}
                  <div
                    className="relative w-[220px] max-w-full flex items-center justify-center transition-all duration-300 z-20 pointer-events-auto"
                    style={{
                      transform: 'translateZ(20px)',
                    }}
                  >
                    {card ? (
                      /* Socketed Card View (GradingSlab or CardRenderer) */
                      <div className="relative group w-full rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center pointer-events-auto">
                        {card.grade ? (
                          <GradingSlab
                            card={card}
                            interactive={false}
                            size="full"
                            className="w-full pointer-events-none select-none !p-0 !m-0"
                            showMarketValue={false}
                            showcaseMode={true}
                          />
                        ) : (
                          <CardRenderer
                            card={card}
                            interactive={false}
                            disableTilt={true}
                            size="full"
                            className="w-full pointer-events-none select-none !p-0 !m-0"
                            showMarketValue={false}
                            hideInternalFooter={true}
                          />
                        )}

                        {/* Pedestal Glass Edge Glow */}
                        <div
                          className="absolute inset-0 rounded-2xl border-2 pointer-events-none select-none transition-colors duration-700 z-20"
                          style={{
                            borderColor: spotlight.hex,
                            boxShadow: `0 0 20px ${spotlight.glow}`,
                          }}
                        />

                        {/* Interactive Hover Overlay Anchor */}
                        <div className="absolute inset-0 z-30 pointer-events-auto w-full h-full rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3 select-none overflow-hidden">
                          {/* Isolated backdrop blur layer */}
                          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-2xl pointer-events-none" />

                          <div className="relative z-10 flex flex-col items-center justify-center gap-2 w-full crisp-render">
                            <span className="text-amber-400 font-bold text-sm tracking-wide text-center leading-tight font-mono">
                              {card.name || 'Card'}
                            </span>
                            <span className="text-xs text-white/70 font-mono">
                              ¥ {calculateCardMarketValue(card).toLocaleString()}
                            </span>

                            <div className="flex gap-2 mt-1 z-40">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPedestalIndex(config.index);
                                }}
                                className="pointer-events-auto z-40 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-3 py-1.5 rounded-lg shadow-md font-mono transition-colors cursor-pointer"
                              >
                                Swap
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnmountCard(config.index);
                                }}
                                className="pointer-events-auto z-40 bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-3 py-1.5 rounded-lg border border-white/10 font-mono transition-colors cursor-pointer"
                              >
                                Unmount
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Empty Pedestal Slot Placeholder */
                      <div
                        onClick={() => setSelectedPedestalIndex(config.index)}
                        className="relative w-full aspect-[63/88] rounded-2xl border-2 border-dashed border-white/20 hover:border-amber-400/70 overflow-hidden flex flex-col items-center justify-center gap-3 p-4 transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] cursor-pointer pointer-events-auto group"
                      >
                        {/* Isolated backdrop blur layer */}
                        <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 backdrop-blur-sm pointer-events-none transition-colors duration-300" />

                        <div className="relative z-10 flex flex-col items-center justify-center gap-3 crisp-render">
                          <div className="w-10 h-10 rounded-2xl bg-white/10 group-hover:bg-amber-500/20 border border-white/20 group-hover:border-amber-400/50 flex items-center justify-center text-zinc-400 group-hover:text-amber-300 transition-colors pointer-events-none select-none">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div className="text-center pointer-events-none select-none">
                            <span className="text-xs font-mono font-bold text-zinc-300 group-hover:text-amber-200 block">
                              Mount Card
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              Slot 0{config.index + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acrylic Pedestal Base Block */}
                  <div className="relative w-[220px] max-w-full h-14 mt-3 rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center justify-center z-10 overflow-hidden pointer-events-none select-none">
                    {/* Isolated backdrop blur layer */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-white/5 to-white/0 backdrop-blur-md pointer-events-none select-none" />

                    {/* Acrylic Top Rim Reflection */}
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none select-none" />

                    <div className="relative z-10 flex flex-col items-center justify-center crisp-render">
                      {/* Pedestal Label Badge */}
                      <div className="flex items-center gap-1.5 pointer-events-none select-none">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: card ? spotlight.hex : '#71717a' }}
                        />
                        <span className="text-[11px] font-mono font-black tracking-wider text-zinc-200 uppercase">
                          Pedestal 0{config.index + 1}
                        </span>
                      </div>

                      {/* Pedestal Sister Attribution or Value */}
                      <span className="text-[10px] font-mono text-zinc-400 mt-0.5 pointer-events-none select-none">
                        {card ? (
                          <span className="text-amber-300 font-semibold">
                            +
                            {(
                              (60 +
                                calculateCardMarketValue(card) *
                                  (1.0 +
                                    (synergyReport.activeSupportBuff?.effects
                                      .sisterMarketValueMultiplier ?? 0)) *
                                  0.0002) *
                              synergyReport.synergyMultiplier
                            ).toFixed(1)}{' '}
                            ¥/min
                          </span>
                        ) : (
                          <span className="text-zinc-500">Vacant</span>
                        )}
                      </span>
                    </div>

                    {/* Ground Pedestal Light Pool */}
                    <div
                      className="absolute -bottom-4 inset-x-0 h-8 blur-md pointer-events-none select-none transition-colors duration-700"
                      style={{ backgroundColor: spotlight.glow }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          SOCKETING DRAWER MODAL
          ============================================================ */}
      <SocketDrawer
        selectedPedestalIndex={selectedPedestalIndex}
        onClose={() => setSelectedPedestalIndex(null)}
      />

      {/* Support Altar Tutor Drawer */}
      <SupportDrawer
        isOpen={isSupportDrawerOpen}
        onClose={() => setIsSupportDrawerOpen(false)}
      />
    </div>
  );
};

export default Vitrine;
