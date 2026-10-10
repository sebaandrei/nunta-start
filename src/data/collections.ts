import type { RecordPatch } from '../domain/collections';
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

/** Șterge câmpul și cheia lui din înregistrările paginii, într-o singură tranzacție pe server. */
export async function deleteCollectionField(id: string): Promise<void> {
  unwrap(await getSupabase().rpc('delete_collection_field', { p_field_id: id }));
}

export async function insertCollectionRecord(weddingId: string, record: ServerCollectionRecord): Promise<void> {
  requireRows(
    unwrap(
      await getSupabase().from('collection_records').insert(collectionRecordToInsert(weddingId, record)).select('id'),
    ),
    'Record',
  );
}

/** Îmbină doar cheile din `patch` în înregistrare (`null` = golit), deci două editări simultane ale unor câmpuri diferite se păstrează. */
export async function patchCollectionRecord(id: string, patch: RecordPatch): Promise<void> {
  unwrap(await getSupabase().rpc('patch_collection_record', { p_record_id: id, p_patch: patch as NonNullable<Json> }));
}

export async function deleteCollectionRecord(id: string): Promise<void> {
  requireRows(unwrap(await getSupabase().from('collection_records').delete().eq('id', id).select('id')), 'Record');
}
