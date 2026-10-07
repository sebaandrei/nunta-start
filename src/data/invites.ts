import type { InviteInfo, InviteStatus, InvitesClient } from '../lib/invites';
import { InvitesWrongAccountError } from '../lib/invites';
import { queryClient } from '../lib/queryClient';
import { keys } from '../lib/queryKeys';
import { getSupabase } from '../lib/supabase';
import { ROLES } from '../lib/workspaces';
import { DataError, unwrap } from './errors';

const STATUSES: readonly InviteStatus[] = ['valid', 'expired', 'used'];

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** Răspunsul RPC-ului `inspect_invitation` (jsonb) în forma paginii; o valoare necunoscută cade pe cea mai prudentă. */
export function inviteInfoFromJson(json: unknown): InviteInfo {
  const o = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {};
  return {
    status: STATUSES.find((s) => s === o.status) ?? 'expired',
    workspaceName: str(o.workspaceName),
    inviterName: str(o.inviterName),
    role: ROLES.find((r) => r === o.role) ?? 'viewer',
    date: strOrNull(o.date),
    city: strOrNull(o.city),
    email: strOrNull(o.email),
  };
}

/** Eroarea RPC-ului de acceptare: contul greșit are propriul mesaj, restul rămân generice. */
function acceptError(error: unknown): unknown {
  if (error instanceof DataError && error.code === '42501' && /another email/i.test(error.message)) {
    return new InvitesWrongAccountError();
  }
  return error;
}

/** Clientul real al paginii de invitație: RPC-urile din Supabase. */
export const supabaseInvitesClient: InvitesClient = {
  async inspect(token) {
    return inviteInfoFromJson(unwrap(await getSupabase().rpc('inspect_invitation', { p_token: token })));
  },
  async accept(token) {
    try {
      unwrap(await getSupabase().rpc('accept_invitation', { p_token: token }));
    } catch (error) {
      throw acceptError(error);
    }
    // Nunta nouă trebuie să apară în alegerea nunților.
    await queryClient.invalidateQueries({ queryKey: keys.list() });
  },
  async decline(token) {
    unwrap(await getSupabase().rpc('decline_invitation', { p_token: token }));
  },
};
