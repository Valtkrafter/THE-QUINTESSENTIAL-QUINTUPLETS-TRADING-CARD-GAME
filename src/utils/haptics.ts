/**
 * TQQ Vault - Web Haptics Engine
 * Provides procedural vibration patterns for tactile feedback on mobile devices.
 * Gracefully falls back to silent bypass if navigator.vibrate is unsupported.
 */

export interface HapticsEngine {
  isSupported: boolean;
  lightTap: () => void;
  tearCrimp: () => void;
  slabCrunch: () => void;
  jackpot: () => void;
  vibrate: (pattern: number | number[]) => boolean;
}

/**
 * Checks if the Vibration API is supported in the current runtime environment.
 */
export function isHapticsSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return typeof navigator.vibrate === 'function';
}

/**
 * Executes a vibration pattern safely with error handling and feature detection.
 */
export function triggerVibration(pattern: number | number[]): boolean {
  try {
    if (isHapticsSupported()) {
      return navigator.vibrate(pattern);
    }
  } catch {
    // Silent bypass on browser policy restrictions
  }
  return false;
}

/**
 * Haptic Profile 1: Light Tap (10ms)
 * Used for tab switches, card selection, filter pills, and button taps.
 */
export function hapticLightTap(): void {
  triggerVibration(10);
}

/**
 * Haptic Profile 2: Tear Crimp ([15ms, 30ms, 15ms])
 * Used when tearing through booster pack foil perforations.
 */
export function hapticTearCrimp(): void {
  triggerVibration([15, 30, 15]);
}

/**
 * Haptic Profile 3: Slab Crunch ([30ms, 50ms, 40ms])
 * Used when cracking open an acrylic BGS grading slab.
 */
export function hapticSlabCrunch(): void {
  triggerVibration([30, 50, 40]);
}

/**
 * Haptic Profile 4: Jackpot Fanfare ([50ms, 50ms, 50ms, 100ms])
 * Used when pulling a UR, SEC, MR, or Black Label certified card.
 */
export function hapticJackpot(): void {
  triggerVibration([50, 50, 50, 100]);
}

export const haptics: HapticsEngine = {
  get isSupported() {
    return isHapticsSupported();
  },
  lightTap: hapticLightTap,
  tearCrimp: hapticTearCrimp,
  slabCrunch: hapticSlabCrunch,
  jackpot: hapticJackpot,
  vibrate: triggerVibration,
};

export default haptics;
