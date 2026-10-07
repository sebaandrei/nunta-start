import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Invitation, Member, Role } from '../domain/members';
import { currentLocale } from '../lib/locale';
import type { MembersClient } from '../lib/members';
import { queryClient } from '../lib/queryClient';
import { keys } from '../lib/queryKeys';
import { useSession } from '../lib/session';
import { getSupabase } from '../lib/supabase';
import { ROLES } from '../lib/workspaces';
import { DataError, unwrap } from './errors';

const roleOf = (value: string): Role => ROLES.find((r) => r === value) ?? 'viewer';

/** Fără nume în profil, adresa de email ține locul (înainte de @). */
function displayName(name: string, email: string): string {
  return name.trim() || email.split('@')[0] || email;
}

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export function invitationFromRow(row: InvitationRow): Invitation {
  return { id: row.id, email: row.email, role: roleOf(row.role), createdAt: row.created_at, expiresAt: row.expires_at };
}

/** Funcția `invite` răspunde cu `{ invitation }`; orice altă formă e o eroare, nu o invitație goală. */
export function invitationFromResponse(body: unknown): Invitation {
  const row = (body as { invitation?: InvitationRow } | null)?.invitation;
  if (!row || typeof row.id !== 'string') throw new DataError('Unexpected response from invite', 502);
  return invitationFromRow(row);
}

/** O cerere care nu a ajuns la server devine `TypeError` (se tratează ca „rețea"), un răspuns 4xx/5xx un `DataError`. */
async function invoke(weddingId: string, email: string, role: Role): Promise<unknown> {
  const { data, error } = await getSupabase().functions.invoke('invite', {
    body: { weddingId, email, role, locale: currentLocale() },
  });
  if (!error) return data;
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    throw new DataError(await res.text().catch(() => error.message), res.status);
  }
  throw new TypeError(error.message);
}

/** Ca `unwrap`, dar un update/delete care nu a atins niciun rând (RLS) e o eroare 403. */
function requireRows(rows: unknown[] | null): void {
  if (!rows || rows.length === 0) throw new DataError('Not allowed', 403);
}

function requireUserId(): string {
  const id = useSession.getState().user?.id;
  if (!id) throw new DataError('Not signed in', 401);
  return id;
}

/** Clientul real al panoului „Membri și invitații" pentru o nuntă. Regulile de rol le aplică RLS și funcțiile din DB. */
export function createMembersClient(weddingId: string): MembersClient {
  const db = () => getSupabase();
  return {
    async list() {
      const rows = unwrap(await db().rpc('list_wedding_members', { p_wedding_id: weddingId }));
      return rows.map(
        (r): Member => ({
          id: r.id,
          name: displayName(r.name, r.email),
          email: r.email,
          role: roleOf(r.role),
          isSelf: r.is_self,
        }),
      );
    },
    async listInvitations() {
      const rows = unwrap(
        await db()
          .from('invitations')
          .select('id, email, role, created_at, expires_at')
          .eq('wedding_id', weddingId)
          .is('accepted_at', null)
          .is('declined_at', null)
          .is('cancelled_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at'),
      );
      return rows.map(invitationFromRow);
    },
    async invite(email, role) {
      return invitationFromResponse(await invoke(weddingId, email, role));
    },
    async cancelInvite(id) {
      unwrap(await db().rpc('cancel_invitation', { p_id: id }));
    },
    async changeRole(memberId, role) {
      requireRows(unwrap(await db().from('wedding_members').update({ role }).eq('id', memberId).select('id')));
      // Rolul meu poate fi cel schimbat (un partener își coboară rolul): nunta se citește din nou.
      void queryClient.invalidateQueries({ queryKey: keys.wedding(weddingId).detail() });
    },
    async remove(memberId) {
      requireRows(unwrap(await db().from('wedding_members').delete().eq('id', memberId).select('id')));
    },
    async leave() {
      const userId = requireUserId();
      requireRows(
        unwrap(
          await db().from('wedding_members').delete().eq('wedding_id', weddingId).eq('user_id', userId).select('id'),
        ),
      );
      queryClient.removeQueries({ queryKey: keys.wedding(weddingId).all });
      await queryClient.invalidateQueries({ queryKey: keys.list() });
    },
  };
}
