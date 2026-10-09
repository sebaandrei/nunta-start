import { describe, expect, it, vi } from 'vitest';
import { type Deps, handleDelete } from './handler';

const caller = { id: 'u1', email: 'ana@example.com' };

function deps(over: Partial<Deps> = {}): Deps {
  return {
    authenticate: vi.fn(async () => caller),
    deleteData: vi.fn(async () => 2),
    deleteUser: vi.fn(async () => undefined),
    ...over,
  };
}

const post = (body: unknown, headers: Record<string, string> = { Authorization: 'Bearer t' }) =>
  new Request('https://x.test/delete-account', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('handleDelete', () => {
  it('deletes the data, then the user, for the authenticated caller', async () => {
    const d = deps();
    const res = await handleDelete(post({ confirm: true }), d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true, weddingsDeleted: 2 });
    expect(d.authenticate).toHaveBeenCalledWith('Bearer t');
    expect(d.deleteData).toHaveBeenCalledWith('u1', 'ana@example.com');
    expect(d.deleteUser).toHaveBeenCalledWith('u1');
  });

  it('takes the user id from the token, never from the body', async () => {
    const d = deps();
    await handleDelete(post({ confirm: true, userId: 'someone-else' }), d);
    expect(d.deleteUser).toHaveBeenCalledWith('u1');
  });

  it('answers the CORS preflight', async () => {
    const res = await handleDelete(new Request('https://x.test', { method: 'OPTIONS' }), deps());
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('rejects other methods', async () => {
    const res = await handleDelete(new Request('https://x.test', { method: 'GET' }), deps());
    expect(res.status).toBe(405);
  });

  it('needs a sign-in', async () => {
    const d = deps();
    expect((await handleDelete(post({ confirm: true }, {}), d)).status).toBe(401);
    expect(d.deleteData).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    const d = deps({ authenticate: vi.fn(async () => null) });
    expect((await handleDelete(post({ confirm: true }), d)).status).toBe(401);
    expect(d.deleteData).not.toHaveBeenCalled();
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  it('treats an auth lookup that throws as not signed in', async () => {
    const d = deps({
      authenticate: vi.fn(async () => {
        throw new Error('network');
      }),
    });
    expect((await handleDelete(post({ confirm: true }), d)).status).toBe(401);
  });

  it('requires the explicit confirm flag', async () => {
    const d = deps();
    expect((await handleDelete(post({}), d)).status).toBe(400);
    expect((await handleDelete(post({ confirm: 'true' }), d)).status).toBe(400);
    expect((await handleDelete(post('not json'), d)).status).toBe(400);
    expect(d.authenticate).not.toHaveBeenCalled();
    expect(d.deleteData).not.toHaveBeenCalled();
  });

  it('keeps the auth user when the data step fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const d = deps({
      deleteData: vi.fn(async () => {
        throw new Error('db');
      }),
    });
    expect((await handleDelete(post({ confirm: true }), d)).status).toBe(500);
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  it('reports a failed auth deletion so the caller can retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const d = deps({
      deleteUser: vi.fn(async () => {
        throw new Error('auth');
      }),
    });
    const res = await handleDelete(post({ confirm: true }), d);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain('try again');
  });
});
