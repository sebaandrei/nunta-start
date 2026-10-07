import { describe, expect, it } from 'vitest';
import { DataError } from './errors';
import { invitationFromResponse, invitationFromRow } from './members';

const row = {
  id: 'i1',
  email: 'a@b.ro',
  role: 'helper',
  created_at: '2026-10-07T10:00:00Z',
  expires_at: '2026-10-21T10:00:00Z',
};

describe('invitationFromRow', () => {
  it('maps the columns to the panel shape', () => {
    expect(invitationFromRow(row)).toEqual({
      id: 'i1',
      email: 'a@b.ro',
      role: 'helper',
      createdAt: '2026-10-07T10:00:00Z',
      expiresAt: '2026-10-21T10:00:00Z',
    });
  });

  it('falls back to the least-privileged role for an unknown one', () => {
    expect(invitationFromRow({ ...row, role: 'god' }).role).toBe('viewer');
  });
});

describe('invitationFromResponse', () => {
  it('reads the invitation of a successful call', () => {
    expect(invitationFromResponse({ invitation: row }).email).toBe('a@b.ro');
  });

  it('rejects an empty or malformed body instead of inventing an invitation', () => {
    expect(() => invitationFromResponse(null)).toThrow(DataError);
    expect(() => invitationFromResponse({})).toThrow(DataError);
    expect(() => invitationFromResponse({ invitation: {} })).toThrow(DataError);
  });
});
