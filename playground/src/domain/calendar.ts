// Calendar days as plain `YYYY-MM-DD` keys. The rules never ask the clock themselves: the screen reads the clock once
// and hands the key in, so every rule can be tested with any date.

export type DayKey = string;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDayKey(value: string): value is DayKey {
  const match = DAY_KEY.exec(value);
  if (match === null) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** The day on the wall clock of the player's device. */
export function dayKeyOf(date: Date): DayKey {
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayNumber(key: DayKey): number {
  const match = DAY_KEY.exec(key);
  if (match === null) {
    throw new RangeError(`Not a day key: ${key}`);
  }
  return Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return dayNumber(to) - dayNumber(from);
}

/** True when `today` lies inside the window, both ends included. */
export function isWithin(today: DayKey, from: DayKey, to: DayKey): boolean {
  return today >= from && today <= to;
}
