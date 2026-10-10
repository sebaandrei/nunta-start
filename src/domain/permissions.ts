import type { Role } from '../lib/workspaces';

export const MODULES = ['tasks', 'budget', 'settings', 'guests', 'pages'] as const;
export type Module = (typeof MODULES)[number];

const ALL_EDITORS: readonly Role[] = ['owner', 'partner', 'planner'];

/**
 * Cine poate modifica un modul. Oglindește politicile RLS din supabase/migrations:
 * - taskuri (și invitați, și paginile proprii): owner, partner, planner, helper;
 * - buget și setările nunții: owner, partner, planner;
 * - viewer: doar citește, nicăieri nu scrie.
 */
const EDITORS: Record<Module, readonly Role[]> = {
  tasks: [...ALL_EDITORS, 'helper'],
  guests: [...ALL_EDITORS, 'helper'],
  pages: [...ALL_EDITORS, 'helper'],
  budget: ALL_EDITORS,
  settings: ALL_EDITORS,
};

export function canEdit(role: Role, module: Module): boolean {
  return EDITORS[module].includes(role);
}
