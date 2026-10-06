/** Partea de citire a bugetului (NS-043 adaugă mutațiile). */
import { getSupabase } from '../lib/supabase';
import { unwrap } from './errors';
import type { BudgetLineRow, BudgetScenarioRow, BudgetSettingsRow } from './mappers';

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
