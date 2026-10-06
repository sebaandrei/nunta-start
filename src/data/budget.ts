/** Bugetul pe server: setări, scenarii (1-4) și linii. Scrierile le fac hook-urile din budgetActions.ts. */

import type { BudgetLine } from '../domain/schema';
import { getSupabase } from '../lib/supabase';
import { DataError, unwrap } from './errors';
import {
  type BudgetLineRow,
  type BudgetLineUpdate,
  type BudgetScenarioRow,
  type BudgetSettingsRow,
  type BudgetSettingsUpdate,
  lineToInsert,
} from './mappers';

/** RLS filtrează tăcut rândurile fără drept: zero rânduri atinse = 403. */
function requireRows(rows: readonly unknown[], what: string): void {
  if (rows.length === 0) throw new DataError(`${what} not written`, 403, '42501');
}

export async function getBudgetSettings(weddingId: string): Promise<BudgetSettingsRow | null> {
  return unwrap(await getSupabase().from('budget_settings').select('*').eq('wedding_id', weddingId).maybeSingle());
}

export async function listBudgetScenarios(weddingId: string): Promise<BudgetScenarioRow[]> {
  return unwrap(
    await getSupabase()
      .from('budget_scenarios')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
  );
}

export async function listBudgetLines(weddingId: string): Promise<BudgetLineRow[]> {
  return unwrap(
    await getSupabase()
      .from('budget_lines')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
  );
}

/** Scrie doar coloanele din `update`; rândul setărilor se creează dacă lipsește (upsert pe `wedding_id`). */
export async function saveBudgetSettings(weddingId: string, update: BudgetSettingsUpdate): Promise<void> {
  const rows = unwrap(
    await getSupabase()
      .from('budget_settings')
      .upsert({ ...update, wedding_id: weddingId }, { onConflict: 'wedding_id' })
      .select('wedding_id'),
  );
  requireRows(rows, 'Budget settings');
}

export async function insertScenario(weddingId: string, id: string, guests: number, position: number): Promise<void> {
  const rows = unwrap(
    await getSupabase().from('budget_scenarios').insert({ id, wedding_id: weddingId, guests, position }).select('id'),
  );
  requireRows(rows, 'Scenario');
}

export async function updateScenarioGuests(id: string, guests: number): Promise<void> {
  requireRows(
    unwrap(await getSupabase().from('budget_scenarios').update({ guests }).eq('id', id).select('id')),
    'Scenario',
  );
}

/** Triggerul din DB refuză ștergerea ultimului scenariu; dacă era cel ales, FK-ul îl pune pe null (acțiunea îl mută apoi). */
export async function deleteScenario(id: string): Promise<void> {
  requireRows(unwrap(await getSupabase().from('budget_scenarios').delete().eq('id', id).select('id')), 'Scenario');
}

export async function insertBudgetLine(weddingId: string, line: BudgetLine, position: number): Promise<void> {
  const rows = unwrap(
    await getSupabase()
      .from('budget_lines')
      .insert(lineToInsert(weddingId, line, position))
      .select('id'),
  );
  requireRows(rows, 'Budget line');
}

export async function updateBudgetLine(id: string, update: BudgetLineUpdate): Promise<void> {
  requireRows(unwrap(await getSupabase().from('budget_lines').update(update).eq('id', id).select('id')), 'Budget line');
}

export async function deleteBudgetLine(id: string): Promise<void> {
  requireRows(unwrap(await getSupabase().from('budget_lines').delete().eq('id', id).select('id')), 'Budget line');
}

/** „Golește sumele": prețurile și plățile liniilor și darurile devin goale; restul rămâne. */
export async function clearBudgetAmounts(weddingId: string): Promise<void> {
  unwrap(await getSupabase().rpc('clear_budget_amounts', { p_wedding_id: weddingId }));
}
