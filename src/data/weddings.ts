import { budgetDefaults, taskTemplate } from '../content';
import type { Locale } from '../lib/locale';
import { useSession } from '../lib/session';
import { getSupabase } from '../lib/supabase';
import { ROLES, type Role } from '../lib/workspaces';
import { DataError, unwrap } from './errors';
import { type CreateWeddingInput, createWeddingArgs, type Wedding, type WeddingRow, weddingFromRow } from './mappers';

const SELECT = '*, wedding_members!inner(user_id, role)';

function requireUserId(): string {
  const id = useSession.getState().user?.id;
  if (!id) throw new DataError('Not signed in', 401);
  return id;
}

function roleOf(members: readonly { role: string }[]): Role {
  return ROLES.find((r) => r === members[0]?.role) ?? 'viewer';
}

type Joined = WeddingRow & { wedding_members: { role: string }[] };

function fromJoined({ wedding_members, ...row }: Joined): Wedding {
  return weddingFromRow(row, roleOf(wedding_members));
}

/** Nunțile mele (nu cele șterse), cu rolul meu; cea mai veche prima. RLS arată oricum doar nunțile mele. */
export async function listMyWeddings(): Promise<Wedding[]> {
  const uid = requireUserId();
  const rows = unwrap(
    await getSupabase()
      .from('weddings')
      .select(SELECT)
      .eq('wedding_members.user_id', uid)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
  );
  return rows.map(fromJoined);
}

/** O nuntă; `null` dacă nu există sau nu sunt membru (RLS nu întoarce nimic). */
export async function getWedding(id: string): Promise<Wedding | null> {
  const uid = requireUserId();
  const row = unwrap(
    await getSupabase()
      .from('weddings')
      .select(SELECT)
      .eq('id', id)
      .eq('wedding_members.user_id', uid)
      .is('deleted_at', null)
      .maybeSingle(),
  );
  if (!row) return null;
  return fromJoined(row);
}

/** Creează nunta prin RPC, cu șabloanele limbii date; întoarce id-ul noii nunți. */
export async function createWedding(input: CreateWeddingInput, locale: Locale): Promise<string> {
  const args = createWeddingArgs(input, taskTemplate(locale), budgetDefaults(locale));
  return unwrap(await getSupabase().rpc('create_wedding', args));
}
