import type { RecordData } from '../domain/collections';
import { getSupabase } from '../lib/supabase';
import type { Json } from '../types/database';
import { DataError, unwrap, unwrapOne } from './errors';
import {
  type CollectionFieldUpdate,
  collectionFieldFromRow,
  collectionFieldToInsert,
  collectionFromRow,
  collectionRecordFromRow,
  collectionRecordToInsert,
  type ServerCollection,
  type ServerCollectionField,
  type ServerCollectionRecord,
} from './mappers';

/** RLS filtrează tăcut rândurile fără drept: zero rânduri atinse = 403. */
function requireRows(rows: readonly unknown[], what: string): void {
  if (rows.length === 0) throw new DataError(`${what} not written`, 403, '42501');
}

const ordered = <Q extends { order: (column: string, options: { ascending: boolean }) => Q }>(query: Q) =>
  query.order('position', { ascending: true }).order('created_at', { ascending: true });

export async function listCollections(weddingId: string): Promise<ServerCollection[]> {
  const rows = unwrap(await ordered(getSupabase().from('collections').select('*').eq('wedding_id', weddingId)));
  return rows.map(collectionFromRow);
}

export async function listCollectionFields(weddingId: string): Promise<ServerCollectionField[]> {
  const rows = unwrap(await ordered(getSupabase().from('collection_fields').select('*').eq('wedding_id', weddingId)));
  return rows.map(collectionFieldFromRow);
}

export async function listCollectionRecords(weddingId: string): Promise<ServerCollectionRecord[]> {
  const rows = unwrap(await ordered(getSupabase().from('collection_records').select('*').eq('wedding_id', weddingId)));
  return rows.map(collectionRecordFromRow);
}

/** Slug-ul îl pune DB; de aceea rândul se citește înapoi (adresa paginii noi nu se știe dinainte). */
export async function insertCollection(weddingId: string, name: string, position: number): Promise<ServerCollection> {
  const row = unwrapOne(
    await getSupabase().from('collections').insert({ wedding_id: weddingId, name, position }).select('*').single(),
  );
  return collectionFromRow(row);
}

/** Doar numele se schimbă; slug-ul e imuabil în DB. */
export async function renameCollection(id: string, name: string): Promise<void> {
  requireRows(unwrap(await getSupabase().from('collections').update({ name }).eq('id', id).select('id')), 'Collection');
}

/** Câmpurile și înregistrările paginii se șterg odată cu ea (cascadă în DB). */
export async function deleteCollection(id: string): Promise<void> {
  requireRows(unwrap(await getSupabase().from('collections').delete().eq('id', id).select('id')), 'Collection');
}

export async function insertCollectionField(weddingId: string, field: ServerCollectionField): Promise<void> {
  requireRows(
    unwrap(
      await getSupabase().from('collection_fields').insert(collectionFieldToInsert(weddingId, field)).select('id'),
    ),
    'Field',
  );
}

export async function updateCollectionField(id: string, update: CollectionFieldUpdate): Promise<void> {
  requireRows(unwrap(await getSupabase().from('collection_fields').update(update).eq('id', id).select('id')), 'Field');
}

/**
 * Înregistrările care au cheia câmpului (`strip`, deja fără ea) se scriu întâi: triggerul de validare
 * respinge o cheie necunoscută la orice scriere următoare a înregistrării.
 */
export async function deleteCollectionField(
  id: string,
  strip: readonly { id: string; data: RecordData }[],
): Promise<void> {
  await Promise.all(strip.map((record) => updateCollectionRecord(record.id, record.data)));
  requireRows(unwrap(await getSupabase().from('collection_fields').delete().eq('id', id).select('id')), 'Field');
}

export async function insertCollectionRecord(weddingId: string, record: ServerCollectionRecord): Promise<void> {
  requireRows(
    unwrap(
      await getSupabase().from('collection_records').insert(collectionRecordToInsert(weddingId, record)).select('id'),
    ),
    'Record',
  );
}

export async function updateCollectionRecord(id: string, data: RecordData): Promise<void> {
  requireRows(
    unwrap(
      await getSupabase()
        .from('collection_records')
        .update({ data: data as NonNullable<Json> })
        .eq('id', id)
        .select('id'),
    ),
    'Record',
  );
}

export async function deleteCollectionRecord(id: string): Promise<void> {
  requireRows(unwrap(await getSupabase().from('collection_records').delete().eq('id', id).select('id')), 'Record');
}
