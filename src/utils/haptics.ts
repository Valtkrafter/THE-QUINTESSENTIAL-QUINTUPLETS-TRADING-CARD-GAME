/**
 * TQQ Vault - Tactile Haptic Feedback Utility
 * Native Vibration API wrapper with safe browser/SSR guardrails.
 */

/**
 * Triggers a realistic tactile crimp tearing sensation on supported mobile devices.
 * Uses a sequence of micro-vibrations followed by a snap impulse.
 */
export function hapticTearCrimp(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      // 15ms tear friction -> 20ms pause -> 25ms paper fiber yield -> 10ms pause -> 40ms foil release snap
      navigator.vibrate([15, 20, 25, 10, 40]);
    } catch {
      // Fail gracefully on devices or browsers restricting vibration API
    }
  }
}

/**
 * Light tactile tick for notch grab / slider interactions.
 */
export function hapticLight(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(10);
    } catch {
      // Graceful fallback
    }
  }
}

/**
 * Solid confirmation vibration on card pull or milestone reveal.
 */
export function hapticSuccess(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([30, 40, 60]);
    } catch {
      // Graceful fallback
    }
  }
}
