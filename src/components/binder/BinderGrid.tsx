'use client';

import React from 'react';
import { CardInstance } from '../../types/card';
import { calculateCardMarketValue } from '../../config/economy';
import { CardRenderer } from '../card/CardRenderer';

export interface BinderGridProps {
  cards: CardInstance[];
  onCardClick: (card: CardInstance) => void;
}

export const BinderGrid: React.FC<BinderGridProps> = ({ cards, onCardClick }) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 pb-24 w-full auto-rows-max">
      {cards.map((card) => {
        const marketValue = calculateCardMarketValue(card);

        return (
          <div
            key={card.id}
            onClick={() => onCardClick(card)}
            className="w-full flex flex-col items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-amber-400/50 transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)] cursor-pointer group"
          >
            {/* 1. Inner Card container: strictly aspect-[63/88] */}
            <div className="w-full aspect-[63/88] relative">
              <CardRenderer
                card={card}
                size="full"
                interactive={false}
                disableTilt={true}
                showMarketValue={false}
                hideInternalFooter={true}
                className="w-full h-full !p-0 !m-0"
              />
              {/* Hover Glow Rim */}
              <div className="absolute inset-0 rounded-xl border-2 border-amber-400/0 group-hover:border-amber-400/80 pointer-events-none transition duration-300 z-40" />
            </div>

            {/* 2. Symmetrical Binder Slot Footer */}
            <div className="mt-2.5 flex w-full items-center justify-between px-1 text-xs">
              {/* Left: Market Valuation */}
              <div className="flex items-center gap-1 font-mono font-bold text-amber-300">
                <span>¥</span>
                <span>{marketValue.toLocaleString()}</span>
              </div>

              {/* Right: Rarity / Finish Indicator */}
              <div className="flex items-center gap-1.5">
                {card.finish !== 'raw' && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                    {card.finish.replace('_', ' ').toUpperCase()}
                  </span>
                )}
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300 border border-white/10">
                  {card.rarity}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BinderGrid;
