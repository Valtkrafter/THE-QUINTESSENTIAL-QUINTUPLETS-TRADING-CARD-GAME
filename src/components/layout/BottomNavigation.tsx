'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { hapticLightTap } from '../../utils/haptics';

export type MobileNavTab = 'showcase' | 'packs' | 'showdown' | 'dex' | 'vault';

export interface BottomNavigationProps {
  activeTab: MobileNavTab;
  onTabChange: (tab: MobileNavTab) => void;
  inventoryCount?: number;
  dexDiscoveredCount?: number;
}

interface NavTabItem {
  id: MobileNavTab;
  label: string;
  icon: string;
  badge?: string | number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  inventoryCount,
  dexDiscoveredCount,
}) => {
  const tabs: NavTabItem[] = [
    {
      id: 'showcase',
      label: 'Showcase',
      icon: '🏛️',
    },
    {
      id: 'packs',
      label: 'Packs',
      icon: '🎴',
    },
    {
      id: 'showdown',
      label: 'Showdown',
      icon: '⚔️',
    },
    {
      id: 'dex',
      label: 'Card-Dex',
      icon: '📖',
      badge: dexDiscoveredCount ? `${dexDiscoveredCount}/42` : undefined,
    },
    {
      id: 'vault',
      label: 'Vault',
      icon: '💼',
      badge: inventoryCount !== undefined ? inventoryCount : undefined,
    },
  ];

  const handleSelectTab = (tabId: MobileNavTab) => {
    if (tabId !== activeTab) {
      hapticLightTap();
      onTabChange(tabId);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[calc(64px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-[#08080a]/95 backdrop-blur-xl border-t border-[#1e1e28] select-none flex items-center justify-around px-2 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleSelectTab(tab.id)}
            className="relative flex-1 min-w-[48px] h-[48px] flex flex-col items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer touch-manipulation group"
            aria-label={tab.label}
          >
            {/* Active Sliding Glowing Pill Indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-1 rounded-xl bg-amber-500/15 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}

            {/* Icon & Badge Container */}
            <div className="relative z-10 flex items-center justify-center">
              <span
                className={`text-xl transition-transform duration-150 ${
                  isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'opacity-70 group-hover:opacity-100'
                }`}
              >
                {tab.icon}
              </span>

              {tab.badge !== undefined && (
                <span className="absolute -top-1.5 -right-3 px-1 py-0.2 rounded-full bg-amber-500 text-black font-mono text-[8px] font-black leading-tight border border-black shadow">
                  {tab.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={`relative z-10 text-[10px] font-mono tracking-tight font-bold transition-colors duration-150 ${
                isActive ? 'text-amber-400 font-black' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
