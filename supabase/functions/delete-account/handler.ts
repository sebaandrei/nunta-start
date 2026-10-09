// NS-062: the request logic of `delete-account`, kept free of Deno and Supabase imports so Vitest can test it.

export interface Caller {
  id: string;
  email: string | null;
}

export interface Deps {
  /** The signed-in user behind the Authorization header, or null if the token is not valid. */
  authenticate(authorization: string): Promise<Caller | null>;
  /** delete_account_data(): soft-deletes sole-owned weddings, removes memberships, invitations and allowlist entry. */
  deleteData(userId: string, email: string | null): Promise<number>;
  /** Deletes the auth user (cascades to the profile). */
  deleteUser(userId: string): Promise<void>;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export async function handleDelete(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'sign in required' }, 401);

  // An explicit flag, so a stray POST can never delete an account.
  let body: { confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  if (body.confirm !== true) return json({ error: 'confirmation required' }, 400);

  const caller = await deps.authenticate(authorization).catch(() => null);
  if (!caller) return json({ error: 'sign in required' }, 401);

  let weddingsDeleted: number;
  try {
    weddingsDeleted = await deps.deleteData(caller.id, caller.email);
  } catch (error) {
    console.error('delete-account: data step failed', error);
    return json({ error: 'could not delete the account data' }, 500);
  }

  // The data step is idempotent, so a failure here is safe to retry.
  try {
    await deps.deleteUser(caller.id);
  } catch (error) {
    console.error('delete-account: auth user not deleted', error);
    return json({ error: 'could not delete the account, try again' }, 500);
  }

  return json({ deleted: true, weddingsDeleted });
}
