import { isValidISODate, parseISODate } from '../domain/dates';
import type { AppData } from '../domain/schema';
import type { Messages } from '../i18n';
import { useStore } from '../store';
import { formatDate } from './format';

export const ROLES = ['owner', 'partner', 'planner', 'helper', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export interface Workspace {
  id: string;
  /** Numele cuplului; gol dacă nu s-a completat nimic. */
  name: string;
  /** Data nunții (ISO), dacă e cunoscută. */
  date: string | null;
  city: string | null;
  role: Role;
}

/**
 * Lista spațiilor utilizatorului, injectată în ecranul de alegere.
 * Implementarea reală (Supabase: weddings + members) e în src/data/workspacesClient.ts.
 */
export interface WorkspacesClient {
  list(): Promise<Workspace[]>;
}

export const LOCAL_WORKSPACE_ID = 'local';

export function roleLabel(role: Role, t: Messages): string {
  return t.workspaces.roles[role];
}

/** „Ana & Mihai"; un singur nume rămâne singur, niciunul dă șir gol. */
export function coupleName(names: readonly string[]): string {
  return names
    .map((n) => n.trim())
    .filter(Boolean)
    .join(' & ');
}

/** Singura nuntă din browser, ca spațiu cu rol de proprietar; `null` când nu sunt date. */
export function localWorkspace(data: AppData | null): Workspace | null {
  if (!data) return null;
  const { names, weddingDate, city } = data.settings;
  return {
    id: LOCAL_WORKSPACE_ID,
    name: coupleName(names),
    date: weddingDate || null,
    city: city.trim() || null,
    role: 'owner',
  };
}

/** „23 ianuarie 2027 · Brașov"; părțile lipsă sau invalide se omit, iar fără nimic dă șir gol. */
export function dateAndCity(date: string | null, city: string | null): string {
  const dateText = date && isValidISODate(date) ? formatDate(parseISODate(date)) : '';
  return [dateText, city?.trim() ?? ''].filter(Boolean).join(' · ');
}

/** Inițialele din avatar: „Ana & Mihai" devine „A&M"; un nume singur dă primele două litere. */
export function workspaceInitials(name: string): string {
  const parts = name
    .split('&')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}&${parts[1][0]}`.toUpperCase();
  return (parts[0] ?? '').slice(0, 2).toUpperCase();
}

/** Clientul implicit: arată nunta salvată local, dacă există. Funcționează azi, fără server. */
export function createLocalWorkspacesClient(getData: () => AppData | null): WorkspacesClient {
  return {
    list: () => {
      const ws = localWorkspace(getData());
      return Promise.resolve(ws ? [ws] : []);
    },
  };
}

export const localWorkspacesClient = createLocalWorkspacesClient(() => useStore.getState().data);
