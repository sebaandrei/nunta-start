import { describe, expect, it } from 'vitest';
import { inviteInfoFromJson } from './invites';

describe('inviteInfoFromJson', () => {
  it('reads a valid invitation', () => {
    expect(
      inviteInfoFromJson({
        status: 'valid',
        workspaceName: 'Ana & Mihai',
        inviterName: 'Ana',
        role: 'planner',
        date: '2027-01-23',
        city: 'Brașov',
        email: 'voi@exemplu.ro',
      }),
    ).toEqual({
      status: 'valid',
      workspaceName: 'Ana & Mihai',
      inviterName: 'Ana',
      role: 'planner',
      date: '2027-01-23',
      city: 'Brașov',
      email: 'voi@exemplu.ro',
    });
  });

  it('turns empty or missing optional fields into null', () => {
    const info = inviteInfoFromJson({ status: 'used', workspaceName: 'X', role: 'helper', date: null, city: '' });
    expect(info).toMatchObject({ status: 'used', date: null, city: null, email: null, inviterName: '' });
  });

  it('treats anything unknown as expired with the least-privileged role', () => {
    expect(inviteInfoFromJson({ status: 'weird', role: 'god' })).toMatchObject({ status: 'expired', role: 'viewer' });
    expect(inviteInfoFromJson(null)).toMatchObject({ status: 'expired', workspaceName: '' });
  });
});
