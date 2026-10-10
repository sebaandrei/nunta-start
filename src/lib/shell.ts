import type { Task } from '../domain/schema';
import { isRecover } from '../domain/tasks';
import { routes } from './paths';

export type NavId = 'home' | 'tasks' | 'guests' | 'budget' | 'pages' | 'settings';

export interface NavItem {
  id: NavId;
  /** Tiparul rutei; se folosește cu `params={{ weddingId }}`. */
  to: (typeof routes)[NavId];
}

/** Ordinea din meniul lateral și din bara de jos. Căile vin din paths.ts. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', to: routes.home },
  { id: 'tasks', to: routes.tasks },
  { id: 'guests', to: routes.guests },
  { id: 'budget', to: routes.budget },
  { id: 'pages', to: routes.pages },
  { id: 'settings', to: routes.settings },
];

const SECTION_NAV: Record<string, NavId> = {
  start: 'tasks',
  guests: 'guests',
  calculator: 'budget',
  pages: 'pages',
  settings: 'settings',
};

/** Ecranul unei adrese `/w/<id>/<ecran>`, pentru titlul din bara de sus de pe telefon. Necunoscut: acasă. */
export function navIdForPath(pathname: string): NavId {
  const [, w, , section] = pathname.replace(/\/+$/, '').split('/');
  return (w === 'w' && section && SECTION_NAV[section]) || 'home';
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
