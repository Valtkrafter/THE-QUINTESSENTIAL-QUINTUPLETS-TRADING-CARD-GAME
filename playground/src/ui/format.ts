import { LOCALE } from './locale';

/** Joins class names, skipping the ones that are off. */
export function cx(...parts: readonly (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part !== '').join(' ');
}

const YEN = new Intl.NumberFormat(LOCALE);

export function formatYen(amount: number): string {
  return `¥${YEN.format(amount)}`;
}

const DATE = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });

export function formatDate(timestamp: number): string {
  return DATE.format(timestamp);
}

/** A score as printed on a slab: whole numbers without a decimal, halves with one ("9", "9.5", "10"). */
export function formatGrade(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/** One of the four sub-grades as printed, always with one decimal ("9.7"). */
export function formatSubGrade(value: number): string {
  return value.toFixed(1);
}

/** Card number as printed: `007/079`. */
export function formatCardNumber(number: number, total: number): string {
  return `${String(number).padStart(3, '0')}/${String(total).padStart(3, '0')}`;
}
