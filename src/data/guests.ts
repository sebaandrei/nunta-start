import { getSupabase } from '../lib/supabase';
import { DataError, unwrap } from './errors';
import {
  type GuestUpdate,
  guestFromRow,
  guestToInsert,
  type HouseholdUpdate,
  householdFromRow,
  householdToInsert,
  type ServerGuest,
  type ServerHousehold,
} from './mappers';

/** RLS filtrează tăcut rândurile fără drept: zero rânduri atinse = 403. */
function requireRows(rows: readonly unknown[], what: string): void {
  if (rows.length === 0) throw new DataError(`${what} not written`, 403, '42501');
}

export async function listHouseholds(weddingId: string): Promise<ServerHousehold[]> {
  const rows = unwrap(
    await getSupabase()
      .from('households')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
  );
  return rows.map(householdFromRow);
}

export async function listGuests(weddingId: string): Promise<ServerGuest[]> {
  const rows = unwrap(
    await getSupabase()
      .from('guests')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
  );
  return rows.map(guestFromRow);
}

export async function insertHousehold(weddingId: string, household: ServerHousehold): Promise<void> {
  requireRows(
    unwrap(await getSupabase().from('households').insert(householdToInsert(weddingId, household)).select('id')),
    'Household',
  );
}

export async function updateHousehold(id: string, update: HouseholdUpdate): Promise<void> {
  requireRows(unwrap(await getSupabase().from('households').update(update).eq('id', id).select('id')), 'Household');
}

/** Invitații familiei se șterg odată cu ea (cascadă în DB). */
export async function deleteHousehold(id: string): Promise<void> {
  requireRows(unwrap(await getSupabase().from('households').delete().eq('id', id).select('id')), 'Household');
}

export async function insertGuest(weddingId: string, guest: ServerGuest): Promise<void> {
  requireRows(unwrap(await getSupabase().from('guests').insert(guestToInsert(weddingId, guest)).select('id')), 'Guest');
}

export async function updateGuest(id: string, update: GuestUpdate): Promise<void> {
  requireRows(unwrap(await getSupabase().from('guests').update(update).eq('id', id).select('id')), 'Guest');
}

export async function deleteGuest(id: string): Promise<void> {
  requireRows(unwrap(await getSupabase().from('guests').delete().eq('id', id).select('id')), 'Guest');
}
