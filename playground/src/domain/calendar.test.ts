import { describe, expect, it } from 'vitest';
import { dayKeyOf, daysBetween, isDayKey, isWithin } from './calendar';

describe('calendar', () => {
  it('writes the local day of a date', () => {
    expect(dayKeyOf(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
    expect(dayKeyOf(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('knows real day keys from invented ones', () => {
    expect(isDayKey('2026-10-10')).toBe(true);
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('2026-1-1')).toBe(false);
    expect(isDayKey('today')).toBe(false);
  });

  it('counts days across month and year ends', () => {
    expect(daysBetween('2026-10-10', '2026-10-11')).toBe(1);
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-10-10', '2026-10-08')).toBe(-2);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('includes both ends of a window', () => {
    expect(isWithin('2026-10-10', '2026-10-10', '2026-11-04')).toBe(true);
    expect(isWithin('2026-11-04', '2026-10-10', '2026-11-04')).toBe(true);
    expect(isWithin('2026-11-05', '2026-10-10', '2026-11-04')).toBe(false);
    expect(isWithin('2026-10-09', '2026-10-10', '2026-11-04')).toBe(false);
  });
});
