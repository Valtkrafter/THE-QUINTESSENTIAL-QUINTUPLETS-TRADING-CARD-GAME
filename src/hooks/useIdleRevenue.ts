'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { ShowcaseSynergyReport } from '../types/card';
import { calculateShowcaseIdleEarnings } from '../config/economy';
import { soundEngine } from '../utils/audioEngine';

export interface UseIdleRevenueReturn {
  accruedYen: number;
  yieldPerMinute: number;
  yieldPerSecond: number;
  synergyReport: ShowcaseSynergyReport;
  isMaxOfflineReached: boolean;
  offlineHoursAccrued: number;
  claimRevenue: () => number;
}

const MAX_OFFLINE_HOURS = 12;
const MAX_OFFLINE_MS = MAX_OFFLINE_HOURS * 60 * 60 * 1000; // 43,200,000 ms

/**
 * High-performance idle revenue calculator for the 5-slot Acrylic Showcase (Vitrine).
 *
 * Implements:
 * 1. Exact Idle Yield Formula:
 *    Yield/Min = Sum_{i=1}^5 (60 Yen + Market Value_i * 0.0002) * Synergy Multiplier
 * 2. 12-hour offline revenue accrual cap.
 * 3. Background tab protection:
 *    Listens to document visibility changes and recalculates elapsed time from
 *    wall-clock timestamps (Date.now()) to prevent interval throttling / drift.
 */
export function useIdleRevenue(): UseIdleRevenueReturn {
  const showcaseSlots = useGameStore((state) => state.showcaseSlots);
  const supportSlot = useGameStore((state) => state.supportSlot);
  const inventory = useGameStore((state) => state.inventory);
  const lastClaimedTimestamp = useGameStore((state) => state.showcaseLastClaimedTimestamp);
  const getShowcaseSynergyReport = useGameStore((state) => state.getShowcaseSynergyReport);
  const claimShowcaseRevenue = useGameStore((state) => state.claimShowcaseRevenue);

  // Memoize active showcase synergy report
  const synergyReport = useMemo(() => {
    return getShowcaseSynergyReport();
  }, [getShowcaseSynergyReport, showcaseSlots, supportSlot, inventory]);

  const yieldPerMinute = synergyReport.effectiveYieldPerMinute;
  const yieldPerSecond = synergyReport.effectiveYieldPerSecond;

  // Real-time accrued Yen counter
  const [accruedYen, setAccruedYen] = useState<number>(() => {
    const elapsedMinutes = (Date.now() - (lastClaimedTimestamp || Date.now())) / 60000;
    return calculateShowcaseIdleEarnings(synergyReport, elapsedMinutes, MAX_OFFLINE_HOURS);
  });

  // Calculate elapsed offline time metrics
  const now = Date.now();
  const rawElapsedMs = Math.max(0, now - (lastClaimedTimestamp || now));
  const effectiveElapsedMs = Math.min(rawElapsedMs, MAX_OFFLINE_MS);
  const isMaxOfflineReached = rawElapsedMs >= MAX_OFFLINE_MS;
  const offlineHoursAccrued = Number((effectiveElapsedMs / (1000 * 60 * 60)).toFixed(2));

  // High-precision synchronizer function
  const synchronizeAccrued = useCallback(() => {
    const currentNow = Date.now();
    const elapsedMinutes = (currentNow - (lastClaimedTimestamp || currentNow)) / 60000;
    const computed = calculateShowcaseIdleEarnings(synergyReport, elapsedMinutes, MAX_OFFLINE_HOURS);
    setAccruedYen(computed);
  }, [lastClaimedTimestamp, synergyReport]);

  useEffect(() => {
    // Immediate calculation on mount or state change
    synchronizeAccrued();

    // 1-second active ticker for live ticking UI
    const tickerInterval = window.setInterval(() => {
      synchronizeAccrued();
    }, 1000);

    // Background tab protection:
    // When the browser tab is minimized or inactive, setInterval is heavily throttled.
    // On visibility restoration, immediately resynchronize from Date.now() wall clock.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        synchronizeAccrued();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', synchronizeAccrued);

    return () => {
      window.clearInterval(tickerInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', synchronizeAccrued);
    };
  }, [synchronizeAccrued]);

  // Claim Vault Revenue action
  const claimRevenue = useCallback((): number => {
    const claimed = claimShowcaseRevenue();
    setAccruedYen(0);
    if (claimed > 0) {
      soundEngine.playCoinPulseSound();
    }
    return claimed;
  }, [claimShowcaseRevenue]);

  return {
    accruedYen,
    yieldPerMinute,
    yieldPerSecond,
    synergyReport,
    isMaxOfflineReached,
    offlineHoursAccrued,
    claimRevenue,
  };
}
