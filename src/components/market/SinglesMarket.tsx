'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance, KioskOffering } from '../../types/card';
import { CARD_MAP } from '../../config/cardsData';
import { KIOSK_REROLL_STARDUST_COST, KIOSK_ROTATION_INTERVAL_MS } from '../../config/economy';
import { resolveActiveSupportBuff } from '../../config/supportBuffs';
import { useGameStore } from '../../store/useGameStore';
import { CardRenderer, CHARACTER_THEMES, RARITY_BADGES, FINISH_LABELS } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import {
  Store,
  Clock,
  RotateCw,
  Coins,
  Sparkles,
  CheckCircle2,
  Lock,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  Zap,
} from 'lucide-react';

export interface SinglesMarketProps {
  onCardPurchased?: (card: CardInstance) => void;
}

export const SinglesMarket: React.FC<SinglesMarketProps> = ({ onCardPurchased }) => {
  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const supportSlot = useGameStore((state) => state.supportSlot);
  const kioskStock = useGameStore((state) => state.kioskStock);
  const kioskLastRefreshed = useGameStore((state) => state.kioskLastRefreshed);
  const refreshKiosk = useGameStore((state) => state.refreshKiosk);
  const buyKioskCard = useGameStore((state) => state.buyKioskCard);
  const checkAndRotateKiosk = useGameStore((state) => state.checkAndRotateKiosk);

  // Active Support Altar buff
  const activeSupportBuff = useMemo(() => {
    return resolveActiveSupportBuff(supportSlot);
  }, [supportSlot]);
  const kioskDiscount = activeSupportBuff?.effects.kioskDiscount ?? 0;

  // Time ticker state
  const [now, setNow] = useState<number>(Date.now());
  const [isRerolling, setIsRerolling] = useState<boolean>(false);
  const [purchasingSlotId, setPurchasingSlotId] = useState<string | null>(null);
  const [justPurchasedCard, setJustPurchasedCard] = useState<{ name: string; price: number } | null>(null);

  // Ensure stock is available & update 1-second countdown clock
  useEffect(() => {
    checkAndRotateKiosk();
    const interval = setInterval(() => {
      setNow(Date.now());
      checkAndRotateKiosk();
    }, 1000);
    return () => clearInterval(interval);
  }, [checkAndRotateKiosk]);

  // Calculate countdown time until next automatic 24h rotation
  const timeRemainingMs = Math.max(
    0,
    kioskLastRefreshed + KIOSK_ROTATION_INTERVAL_MS - now
  );

  const formatCountdown = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Manual reroll handler
  const handleManualReroll = () => {
    if (stardust < KIOSK_REROLL_STARDUST_COST || isRerolling) return;
    setIsRerolling(true);
    soundEngine.playToolClickSound();
    try {
      refreshKiosk(true);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setTimeout(() => setIsRerolling(false), 450);
    }
  };

  // Card purchase handler
  const handleBuyCard = async (offering: KioskOffering) => {
    if (offering.isPurchased || yen < offering.priceYen || purchasingSlotId) return;

    setPurchasingSlotId(offering.id);
    try {
      const card = buyKioskCard(offering.id);
      soundEngine.playReceiptSound();
      setJustPurchasedCard({
        name: card.name ?? 'Anime Single',
        price: offering.priceYen,
      });
      onCardPurchased?.(card);

      setTimeout(() => {
        setJustPurchasedCard(null);
      }, 3500);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setPurchasingSlotId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 select-none animate-fadeIn">
      {/* ============================================================
          KIOSK HEADER BAR: Title, 24h Countdown & Manual Reroll
          ============================================================ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#111116] border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl relative overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase font-mono">
                Singles Kiosk
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono border border-emerald-500/30">
                DAILY ROTATION
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Direct anime card liquidation exchange. Guaranteed raw cards replenished every 24 hours.
            </p>
            {kioskDiscount > 0 && (
              <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs font-mono text-amber-300">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{activeSupportBuff?.badgeLabel || `ACTIVE BUFF: ${(kioskDiscount * 100).toFixed(0)}% KIOSK DISCOUNT`}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Countdown Clock & Reroll Button */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* 24-Hour Epoch Countdown Timer */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/60 border border-white/10 font-mono shadow-inner">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 leading-none">
                Next Refresh In
              </span>
              <span className="text-sm font-black text-amber-300 leading-tight">
                {formatCountdown(timeRemainingMs)}
              </span>
            </div>
          </div>

          {/* Manual Reroll Stock (100 Stardust) */}
          <button
            onClick={handleManualReroll}
            disabled={stardust < KIOSK_REROLL_STARDUST_COST || isRerolling}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2 transition-all active:scale-95 shadow-lg border ${
              stardust >= KIOSK_REROLL_STARDUST_COST && !isRerolling
                ? 'bg-purple-950/50 hover:bg-purple-900/60 border-purple-500/40 text-purple-200 hover:text-white shadow-purple-900/20'
                : 'bg-zinc-900/60 border-white/5 text-zinc-500 cursor-not-allowed opacity-60'
            }`}
            title={`Refresh Kiosk stock immediately for ${KIOSK_REROLL_STARDUST_COST} Stardust`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRerolling ? 'animate-spin text-purple-400' : ''}`} />
            <span>Reroll Stock</span>
            <span className="flex items-center gap-1 text-[11px] text-purple-300 font-black">
              <Sparkles className="w-3 h-3" />
              100 ★
            </span>
          </button>
        </div>
      </div>

      {/* Floating Purchase Success Banner */}
      <AnimatePresence>
        {justPurchasedCard && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 shadow-2xl flex items-center justify-between text-white font-mono backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs text-emerald-300 font-bold">PURCHASE SUCCESSFUL:</span>
                <span className="text-sm font-black text-white ml-1.5">{justPurchasedCard.name}</span>
              </div>
            </div>
            <div className="text-xs text-emerald-400 font-black">
              -{justPurchasedCard.price.toLocaleString()} ¥ • Added to Inventory
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          4-CARD KIOSK GRID (Brushed Dark Slate #111116)
          ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kioskStock.map((offering) => {
          const cardDef = CARD_MAP[offering.cardDefId];
          const charTheme = cardDef
            ? CHARACTER_THEMES[cardDef.characterId] ?? CHARACTER_THEMES.miku
            : CHARACTER_THEMES.miku;
          const canAfford = yen >= offering.priceYen;
          const isPurchased = offering.isPurchased;
          const isProcessing = purchasingSlotId === offering.id;

          // Ephemeral CardInstance for real-time 3D rendering
          const previewCard: CardInstance = {
            id: offering.id,
            cardDefId: offering.cardDefId,
            characterId: cardDef?.characterId ?? 'miku',
            rarity: offering.rarity,
            finish: offering.finish,
            obtainedAt: 0,
            imageUrl: cardDef?.imageUrl,
            name: cardDef?.name,
            title: cardDef?.title,
            cardNumber: cardDef?.cardNumber,
            forceFit: cardDef?.forceFit,
          };

          return (
            <div
              key={offering.id}
              className={`relative rounded-3xl p-4 flex flex-col justify-between border transition-all duration-300 overflow-hidden group shadow-2xl bg-[#111116] ${
                isPurchased
                  ? 'border-white/5 opacity-60'
                  : 'border-white/10 hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]'
              }`}
            >
              {/* Subtle Character Color Gradient Header */}
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40"
                style={{ background: charTheme.accent }}
              />

              {/* Card Meta Header */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{charTheme.symbol}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider ${RARITY_BADGES[offering.rarity]}`}>
                    {offering.rarity}
                  </span>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-mono">
                  {FINISH_LABELS[offering.finish]}
                </span>
              </div>

              {/* 3D Interactive Card Preview Stage */}
              <div className="w-full flex justify-center py-2 relative z-10">
                <div className="relative">
                  <CardRenderer
                    card={previewCard}
                    size="sm"
                    interactive={!isPurchased}
                    showMarketValue={false}
                  />

                  {/* Sold Out Frosted Overlay */}
                  {isPurchased && (
                    <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-3 text-center border border-white/10">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 mb-2">
                        <Lock className="w-5 h-5 text-zinc-500" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-300 font-mono">
                        SOLD OUT
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        Claimed for today
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Title & Info */}
              <div className="mt-3 pt-3 border-t border-white/10 relative z-10">
                <h4 className="text-xs font-black text-white truncate">
                  {cardDef?.name ?? 'Single Card'}
                </h4>
                <p className="text-[11px] text-zinc-400 truncate">
                  {cardDef?.title ?? 'Raw Edition'}
                </p>
              </div>

              {/* Price Tag & Purchase Button */}
              <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-col gap-2 relative z-10">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[10px] uppercase text-zinc-400">Fixed Kiosk Rate</span>
                  <div className="text-sm font-black text-amber-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{offering.priceYen.toLocaleString()} ¥</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBuyCard(offering)}
                  disabled={isPurchased || !canAfford || isProcessing}
                  className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                    isPurchased
                      ? 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed'
                      : canAfford
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:brightness-110 text-zinc-950 shadow-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-1.5 animate-pulse font-mono">
                      <ShoppingBag className="w-3.5 h-3.5 animate-bounce" />
                      PURCHASING...
                    </span>
                  ) : isPurchased ? (
                    <span>CLAIMED</span>
                  ) : canAfford ? (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>BUY SINGLE</span>
                    </>
                  ) : (
                    <span>INSUFFICIENT ¥</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SinglesMarket;
