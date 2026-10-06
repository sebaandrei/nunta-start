import { getSupabase } from '../lib/supabase';
import { DataError, unwrap, unwrapOne } from './errors';
import { type ServerTask, type TaskUpdate, taskFromRow, taskToInsert } from './mappers';

export async function listTasks(weddingId: string): Promise<ServerTask[]> {
  const rows = unwrap(
    await getSupabase()
      .from('tasks')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
  );
  return rows.map(taskFromRow);
}

export async function insertTask(weddingId: string, task: ServerTask): Promise<ServerTask> {
  const row = unwrapOne(await getSupabase().from('tasks').insert(taskToInsert(weddingId, task)).select('*').single());
  return taskFromRow(row);
}

/** Trimite doar coloanele din `update`. RLS filtrează tăcut rândurile fără drept: zero rânduri = 403. */
export async function updateTask(id: string, update: TaskUpdate): Promise<ServerTask> {
  const rows = unwrap(await getSupabase().from('tasks').update(update).eq('id', id).select('*'));
  const row = rows[0];
  if (!row) throw new DataError('Task not updated', 403, '42501');
  return taskFromRow(row);
}

export async function deleteTask(id: string): Promise<void> {
  const rows = unwrap(await getSupabase().from('tasks').delete().eq('id', id).select('id'));
  if (rows.length === 0) throw new DataError('Task not deleted', 403, '42501');
}
