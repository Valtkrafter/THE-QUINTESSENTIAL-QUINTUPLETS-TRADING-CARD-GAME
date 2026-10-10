import { useEffect, useState } from 'react';
import { dayKeyOf, type DayKey } from '../../domain/calendar';

/** The day on the player's clock. It is looked up again every minute, so the screens notice midnight. */
export function useToday(): DayKey {
  const [today, setToday] = useState<DayKey>(() => dayKeyOf(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setToday(dayKeyOf(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}
