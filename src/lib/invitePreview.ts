import { type InviteState, initialInviteState } from './inviteState';
import { type InviteInfo, type InvitesClient, InvitesNetworkError } from './invites';

/**
 * Doar pentru teste unitare și pentru previzualizarea din dev (`/invite/x?preview=…`).
 * Ecranul îl importă numai sub `import.meta.env.DEV`, deci nu ajunge în build-ul de producție.
 */
export const PREVIEW_INVITE: InviteInfo = {
  status: 'valid',
  workspaceName: 'Ana & Mihai',
  inviterName: 'Ana',
  role: 'planner',
  date: '2027-01-23',
  city: 'Brașov',
  email: 'voi@exemplu.ro',
};

export function createFakeInvitesClient(info: InviteInfo = PREVIEW_INVITE, fail = false): InvitesClient {
  const act = () => (fail ? Promise.reject(new InvitesNetworkError()) : Promise.resolve());
  return { inspect: () => Promise.resolve(info), accept: act, decline: act };
}

export type PreviewName = 'valid' | 'expired' | 'error';

export interface Preview {
  state: InviteState;
  client: InvitesClient;
}

export function parsePreview(raw: string | null): PreviewName | null {
  return raw === 'valid' || raw === 'expired' || raw === 'error' ? raw : null;
}

export function previewFor(name: PreviewName): Preview {
  switch (name) {
    case 'valid':
      return { state: initialInviteState('valid', PREVIEW_INVITE), client: createFakeInvitesClient() };
    case 'expired': {
      const info = { ...PREVIEW_INVITE, status: 'expired' as const };
      return { state: initialInviteState('expired', info), client: createFakeInvitesClient(info) };
    }
    case 'error':
      return {
        state: { ...initialInviteState('error'), errorKind: 'network' },
        client: createFakeInvitesClient(PREVIEW_INVITE, true),
      };
  }
}
