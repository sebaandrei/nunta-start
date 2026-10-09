// NS-062: deletes the signed-in user's account. Runs with the service role, but only for the user the
// JWT proves: the id comes from auth.getUser(), never from the request body.
//
// Needs no secrets of its own: SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// by the platform. See docs/runbooks/account-deletion.md.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleDelete } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = () => createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve((req) =>
  handleDelete(req, {
    async authenticate(authorization) {
      const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? null };
    },
    async deleteData(userId, email) {
      const { data, error } = await admin().rpc('delete_account_data', { p_user_id: userId, p_email: email ?? '' });
      if (error) throw new Error(error.message);
      return typeof data === 'number' ? data : 0;
    },
    async deleteUser(userId) {
      const { error } = await admin().auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
  }),
);
