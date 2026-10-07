import { FunctionsHttpError } from '@supabase/supabase-js';
import { type RsvpClient, RsvpNotFoundError, RsvpRejectedError } from '../lib/rsvp';
import { getSupabase } from '../lib/supabase';
import { rsvpHouseholdFromJson } from './rsvpParse';

/** Un 404 al funcției înseamnă token necunoscut; alt refuz HTTP e „respins"; restul (rețea) rămâne TypeError. */
function mapError(error: unknown): unknown {
  if (error instanceof FunctionsHttpError) {
    const status = (error.context as Response).status;
    return status === 404 ? new RsvpNotFoundError() : new RsvpRejectedError(status);
  }
  return error;
}

/** TODO(NS-081): clientul real către Edge Function-ul `rsvp`; contractul e descris în src/lib/rsvp.ts. */
export const supabaseRsvpClient: RsvpClient = {
  async fetchHousehold(token) {
    const { data, error } = await getSupabase().functions.invoke(`rsvp/${encodeURIComponent(token)}`, {
      method: 'GET',
    });
    if (error) throw mapError(error);
    return rsvpHouseholdFromJson(data);
  },
  async submitRsvp(token, submission) {
    const { error } = await getSupabase().functions.invoke(`rsvp/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: submission,
    });
    if (error) throw mapError(error);
  },
};
