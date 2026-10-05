import { useEffect, useState } from 'react';
import { startOfDay } from '../domain/dates';

/** Ziua de azi, actualizată dacă pagina rămâne deschisă peste miezul nopții. */
export function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = startOfDay(new Date());
      setToday((current) => (current.getTime() === now.getTime() ? current : now));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}
