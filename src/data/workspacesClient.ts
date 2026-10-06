import { queryClient } from '../lib/queryClient';
import type { Workspace, WorkspacesClient } from '../lib/workspaces';
import type { Wedding } from './mappers';
import { weddingsQuery } from './queries';

/** O nuntă ca rând în ecranul de alegere. */
export function toWorkspace(w: Wedding): Workspace {
  return { id: w.id, name: w.name, date: w.date, city: w.city, role: w.role };
}

/** Clientul real al ecranului de alegere: nunțile mele de pe server, prin cache-ul de query-uri. */
export const weddingsClient: WorkspacesClient = {
  list: async () => (await queryClient.fetchQuery(weddingsQuery())).map(toWorkspace),
};
