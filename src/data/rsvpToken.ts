import { getSupabase } from '../lib/supabase';
import { unwrap } from './errors';

/** Creează sau înlocuiește tokenul RSVP al familiei; textul clar vine o singură dată, serverul ține doar hash-ul. */
export async function generateRsvpToken(householdId: string): Promise<string> {
  return unwrap(await getSupabase().rpc('generate_household_rsvp_token', { p_household_id: householdId }));
}

export const rsvpUrl = (token: string) => `${window.location.origin}/r/${token}`;
