import type { Task } from '../domain/schema';
import { isRecover } from '../domain/tasks';
import { paths } from './paths';

export type NavId = 'home' | 'tasks' | 'budget' | 'settings';

export interface NavItem {
  id: NavId;
  to: typeof paths.home | typeof paths.tasks | typeof paths.budget | typeof paths.settings;
}

/** Ordinea din meniul lateral și din bara de jos. Căile vin din paths.ts. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', to: paths.home },
  { id: 'tasks', to: paths.tasks },
  { id: 'budget', to: paths.budget },
  { id: 'settings', to: paths.settings },
];

/** Ecranul unei rute, pentru titlul din bara de sus de pe telefon. Rută necunoscută: acasă. */
export function navIdForPath(pathname: string): NavId {
  const path = pathname.replace(/\/+$/, '') || '/';
  return NAV_ITEMS.find((item) => item.to === path)?.id ?? 'home';
}

/** Numărul din insigna „Taskuri": taskurile de recuperat (nefinalizate, din etape trecute). 0 ascunde insigna. */
export function recoverBadgeCount(tasks: readonly Task[], wedding: Date, today: Date): number {
  return tasks.filter((task) => isRecover(task, wedding, today)).length;
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

export function dayPart(hour: number): DayPart {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** „A&M" din prenume; goale: „N". */
export function coupleInitials(names: readonly [string, string]): string {
  const initials = names.map((n) => n.trim().charAt(0).toUpperCase()).filter(Boolean);
  return initials.length ? initials.join('&') : 'N';
}
