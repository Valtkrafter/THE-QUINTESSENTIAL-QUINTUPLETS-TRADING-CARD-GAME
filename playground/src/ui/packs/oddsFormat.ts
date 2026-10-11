// How the Odds page writes numbers: plain and short, so "1 in 13" and "2.6%" can be read at a glance.

import { LOCALE } from '../locale';

const NUMBER = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const ONE_DECIMAL = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const WHOLE = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** A chance (0..1) as a percentage: "0.5%", "2.6%", "28%". */
export function percentText(chance: number): string {
  const percent = chance * 100;
  if (percent >= 10) {
    return `${WHOLE.format(percent)}%`;
  }
  return `${(percent >= 1 ? ONE_DECIMAL : NUMBER).format(percent)}%`;
}

/** True when a pack holds one in practice every time (99.5% or more), so "1 in 1" is better said as "every pack". */
export function isEveryPack(chance: number): boolean {
  return chance >= 0.995;
}

/** The N of "1 in N" for a chance: "3.8", "13", "200". */
export function oneInNumber(chance: number): string {
  const count = 1 / chance;
  return count < 10 ? ONE_DECIMAL.format(count) : WHOLE.format(count);
}

/** Packs as a whole number with thousands separators. */
export function packsText(count: number): string {
  return WHOLE.format(count);
}

/** Yen rounded to the hundred, for "about ¥9,500". */
export function roundedYen(yen: number): number {
  return Math.round(yen / 100) * 100;
}
