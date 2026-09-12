'use client';

import React from 'react';
import { soundEngine } from '../../utils/audioEngine';

export type DexFilterTab = 'all' | 'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki' | 'support';

export interface DexFilterTabsProps {
  activeTab: DexFilterTab;
  counts: Record<string, { total: number; discovered: number }>;
  onSelect: (tab: DexFilterTab) => void;
  className?: string;
}

interface TabConfig {
  id: DexFilterTab;
  label: string;
  dotColor?: string;
  icon?: string;
}

const TABS: TabConfig[] = [
  { id: 'all', label: 'ALL' },
  { id: 'ichika', label: 'Ichika', dotColor: '#F59E0B', icon: '💛' },
  { id: 'nino', label: 'Nino', dotColor: '#EC4899', icon: '🦋' },
  { id: 'miku', label: 'Miku', dotColor: '#06B6D4', icon: '🎧' },
  { id: 'yotsuba', label: 'Yotsuba', dotColor: '#10B981', icon: '🍀' },
  { id: 'itsuki', label: 'Itsuki', dotColor: '#EF4444', icon: '⭐' },
  { id: 'support', label: 'Support', dotColor: '#64748B', icon: '🎓' },
];

export const DexFilterTabs: React.FC<DexFilterTabsProps> = ({
  activeTab,
  counts,
  onSelect,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar py-0.5 select-none ${className}`}>
      {TABS.map((tab) => {
        const isSelected = activeTab === tab.id;
        const count = counts[tab.id] ?? { total: 0, discovered: 0 };

        return (
          <button
            key={tab.id}
            onClick={() => {
              onSelect(tab.id);
              soundEngine.playFoilRustle();
            }}
            className={`text-xs py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono ${
              isSelected
                ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/10'
            }`}
          >
            {tab.dotColor && (
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: tab.dotColor }}
              />
            )}
            {tab.icon && <span className="text-xs leading-none">{tab.icon}</span>}
            <span className="capitalize">{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                isSelected
                  ? 'bg-black/20 text-black font-bold'
                  : 'bg-white/10 text-zinc-400'
              }`}
            >
              {count.discovered}/{count.total}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default DexFilterTabs;
