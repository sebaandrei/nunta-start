import { useMutation } from '@tanstack/react-query';
import { toISODate } from '../domain/dates';
import { downloadText } from '../lib/download';
import { getSupabase } from '../lib/supabase';
import { unwrap } from './errors';

/** Numele fișierului descărcat: `nunta-start-date-2026-10-08.json`. */
export function exportFileName(now: Date): string {
  return `nunta-start-date-${toISODate(now)}.json`;
}

/** Tot ce aparține utilizatorului: profilul și fiecare nuntă pe care o deține (RPC `export_my_data`). */
export async function exportMyData(): Promise<unknown> {
  return unwrap(await getSupabase().rpc('export_my_data'));
}

/** „Descarcă datele mele": cheamă RPC-ul și salvează răspunsul ca fișier JSON. Eroarea o arată toast-ul global. */
export function useExportMyData() {
  return useMutation({
    mutationFn: exportMyData,
    onSuccess: (data) => downloadText(exportFileName(new Date()), JSON.stringify(data, null, 2)),
  });
}
