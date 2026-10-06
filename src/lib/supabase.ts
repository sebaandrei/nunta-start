import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

let client: SupabaseClient<Database> | null = null;

/** Client Supabase creat la prima folosire; importul modulului nu aruncă niciodată. */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  client = createClient<Database>(url, key);
  return client;
}
