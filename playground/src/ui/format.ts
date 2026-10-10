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

/** Card number as printed: `007/079`. */
export function formatCardNumber(number: number, total: number): string {
  return `${String(number).padStart(3, '0')}/${String(total).padStart(3, '0')}`;
}
