import { describe, expect, it } from 'vitest';
import {
  canChangeRole,
  canLeave,
  canRemove,
  type Invitation,
  initialRoleSync,
  initials,
  invitationAge,
  type Member,
  manageableRoles,
  ROLES,
  type Role,
  settleRoleChange,
  startRoleChange,
  statusAfterLeave,
  validateInvite,
  withRole,
} from './members';

describe('role sync', () => {
  const list = [
    { id: 'a', name: 'a', email: 'a@x.ro', role: 'viewer', isSelf: false },
    { id: 'b', name: 'b', email: 'b@x.ro', role: 'helper', isSelf: false },
  ] as Member[];
  const roleOf = (ms: Member[], id: string) => ms.find((x) => x.id === id)?.role;

  it('a failed change returns to the confirmed role', () => {
    const s = startRoleChange(initialRoleSync, 'a', 'viewer', 1);
    const r = settleRoleChange(s, withRole(list, 'a', 'helper'), 'a', 1, 'helper', false);
    expect(roleOf(r.members, 'a')).toBe('viewer');
    expect(r.sync.inFlight).toEqual({});
  });
  it('a failure after a superseded request is ignored; the last failure restores the original', () => {
    let s = startRoleChange(initialRoleSync, 'a', 'viewer', 1);
    s = startRoleChange(s, 'a', 'helper', 2);
    const ms = withRole(withRole(list, 'a', 'helper'), 'a', 'planner');
    const first = settleRoleChange(s, ms, 'a', 1, 'helper', false);
    expect(first).toEqual({ sync: s, members: ms });
    const second = settleRoleChange(first.sync, first.members, 'a', 2, 'planner', false);
    expect(roleOf(second.members, 'a')).toBe('viewer');
  });
  it('a success updates the confirmed role used by a later failure', () => {
    const s = startRoleChange(initialRoleSync, 'a', 'viewer', 1);
    const ok = settleRoleChange(s, withRole(list, 'a', 'helper'), 'a', 1, 'helper', true);
    expect(ok.sync.confirmed.a).toBe('helper');
    const s2 = startRoleChange(ok.sync, 'a', 'helper', 2);
    const bad = settleRoleChange(s2, withRole(ok.members, 'a', 'planner'), 'a', 2, 'planner', false);
    expect(roleOf(bad.members, 'a')).toBe('helper');
  });
  it('members are independent', () => {
    let s = startRoleChange(initialRoleSync, 'a', 'viewer', 1);
    s = startRoleChange(s, 'b', 'helper', 2);
    const ms = withRole(withRole(list, 'a', 'planner'), 'b', 'viewer');
    const r = settleRoleChange(s, ms, 'a', 1, 'planner', false);
    expect(roleOf(r.members, 'a')).toBe('viewer');
    expect(roleOf(r.members, 'b')).toBe('viewer');
    expect(r.sync.inFlight).toEqual({ b: 2 });
  });
});

describe('statusAfterLeave', () => {
  it('a successful leave is terminal, never ready', () => {
    expect(statusAfterLeave('ready', true)).toBe('left');
    expect(statusAfterLeave('unavailable', true)).toBe('left');
  });
  it('a failed leave keeps the status', () => {
    expect(statusAfterLeave('ready', false)).toBe('ready');
  });
});

const m = (id: string, role: Role, email = `${id}@x.ro`): Member => ({ id, name: id, email, role, isSelf: false });
const owner = m('owner', 'owner');
const partner = m('partner', 'partner');
const planner = m('planner', 'planner');
const helper = m('helper', 'helper');
const viewer = m('viewer', 'viewer');
const all = [owner, partner, planner, helper, viewer];

describe('manageableRoles', () => {
  it('owner and partner manage everything but owner', () => {
    expect(manageableRoles(owner)).toEqual(['partner', 'planner', 'helper', 'viewer']);
    expect(manageableRoles(partner)).toEqual(['partner', 'planner', 'helper', 'viewer']);
  });
  it('planner manages only helper and viewer', () => {
    expect(manageableRoles(planner)).toEqual(['helper', 'viewer']);
  });
  it('helper and viewer manage nothing', () => {
    expect(manageableRoles(helper)).toEqual([]);
    expect(manageableRoles(viewer)).toEqual([]);
  });
});

describe('canChangeRole', () => {
  it('owner and partner change any non-owner to any non-owner role', () => {
    for (const actor of [owner, partner]) {
      expect(canChangeRole(actor, helper, 'planner')).toBe(true);
      expect(canChangeRole(actor, viewer, 'partner')).toBe(true);
      expect(canChangeRole(actor, planner, 'viewer')).toBe(true);
    }
    expect(canChangeRole(owner, partner, 'viewer')).toBe(true);
    expect(canChangeRole(partner, m('p2', 'partner'), 'helper')).toBe(true);
  });
  it('nobody changes an owner or promotes someone to owner', () => {
    for (const actor of all) {
      expect(canChangeRole(actor, owner, 'partner')).toBe(false);
      expect(canChangeRole(actor, helper, 'owner')).toBe(false);
    }
  });
  it('a member may not change their own role', () => {
    for (const actor of all) {
      for (const role of ROLES) expect(canChangeRole(actor, actor, role)).toBe(false);
    }
  });
  it('planner only touches helpers and viewers, to helper or viewer', () => {
    expect(canChangeRole(planner, helper, 'viewer')).toBe(true);
    expect(canChangeRole(planner, viewer, 'helper')).toBe(true);
    expect(canChangeRole(planner, helper, 'planner')).toBe(false);
    expect(canChangeRole(planner, partner, 'viewer')).toBe(false);
    expect(canChangeRole(planner, m('pl2', 'planner'), 'helper')).toBe(false);
  });
  it('helper and viewer change nothing', () => {
    for (const actor of [helper, viewer]) {
      for (const target of all) for (const role of ROLES) expect(canChangeRole(actor, target, role)).toBe(false);
    }
  });
  it('rejects a no-op change', () => {
    expect(canChangeRole(owner, helper, 'helper')).toBe(false);
  });
});

describe('canRemove', () => {
  it('owner and partner remove anyone except owners and themselves', () => {
    for (const actor of [owner, partner]) {
      expect(canRemove(actor, planner)).toBe(true);
      expect(canRemove(actor, helper)).toBe(true);
      expect(canRemove(actor, viewer)).toBe(true);
      expect(canRemove(actor, owner)).toBe(false);
      expect(canRemove(actor, actor)).toBe(false);
    }
    expect(canRemove(owner, partner)).toBe(true);
    expect(canRemove(partner, m('p2', 'partner'))).toBe(true);
  });
  it('an owner is never removable, not even by another owner', () => {
    expect(canRemove(owner, m('o2', 'owner'))).toBe(false);
  });
  it('planner removes only helpers and viewers', () => {
    expect(canRemove(planner, helper)).toBe(true);
    expect(canRemove(planner, viewer)).toBe(true);
    expect(canRemove(planner, partner)).toBe(false);
    expect(canRemove(planner, owner)).toBe(false);
    expect(canRemove(planner, m('pl2', 'planner'))).toBe(false);
  });
  it('helper and viewer remove nobody', () => {
    for (const actor of [helper, viewer]) for (const target of all) expect(canRemove(actor, target)).toBe(false);
  });
});

describe('canLeave', () => {
  it('any non-owner member may leave', () => {
    for (const member of [partner, planner, helper, viewer]) expect(canLeave(member, all)).toBe(true);
  });
  it('an owner may not leave, even with another owner present', () => {
    expect(canLeave(owner, all)).toBe(false);
    expect(canLeave(owner, [owner, m('o2', 'owner')])).toBe(false);
  });
  it('the last owner can never leave', () => {
    expect(canLeave(owner, [owner])).toBe(false);
  });
  it('someone who is not a member cannot leave', () => {
    expect(canLeave(helper, [owner])).toBe(false);
  });
});

describe('validateInvite', () => {
  const pending: Invitation[] = [
    { id: 'i1', email: 'Radu@x.ro', role: 'viewer', createdAt: '2026-01-01', expiresAt: '2026-01-08' },
  ];
  it('flags empty and malformed addresses', () => {
    expect(validateInvite('  ', all, pending)).toBe('empty');
    expect(validateInvite('nope', all, pending)).toBe('invalid');
    expect(validateInvite('a@b', all, pending)).toBe('invalid');
  });
  it('flags a duplicate pending invitation, ignoring case and spaces', () => {
    expect(validateInvite(' radu@X.ro ', all, pending)).toBe('duplicate');
  });
  it('flags an address that already belongs to a member', () => {
    expect(validateInvite('HELPER@x.ro', all, pending)).toBe('member');
  });
  it('accepts a fresh address', () => {
    expect(validateInvite('nou@exemplu.ro', all, pending)).toBeNull();
  });
});

describe('withRole', () => {
  it('changes only the targeted member and does not mutate', () => {
    const next = withRole(all, 'helper', 'viewer');
    expect(next.find((x) => x.id === 'helper')?.role).toBe('viewer');
    expect(next.filter((x) => x.id !== 'helper')).toEqual(all.filter((x) => x.id !== 'helper'));
    expect(helper.role).toBe('helper');
  });
  it('rolling back is restoring the previous snapshot', () => {
    const before = all;
    const optimistic = withRole(before, 'helper', 'planner');
    expect(optimistic).not.toEqual(before);
    expect(before.find((x) => x.id === 'helper')?.role).toBe('helper');
  });
});

describe('invitationAge', () => {
  const now = new Date('2026-03-10T12:00:00Z');
  it('counts days since sent and until expiry', () => {
    const inv: Invitation = {
      id: 'i',
      email: 'a@b.ro',
      role: 'viewer',
      createdAt: '2026-03-08T10:00:00Z',
      expiresAt: '2026-03-15T12:00:00Z',
    };
    expect(invitationAge(inv, now)).toEqual({ sentDays: 2, expiresDays: 5 });
  });
  it('is 0 days for an invitation sent today', () => {
    const inv: Invitation = {
      id: 'i',
      email: 'a@b.ro',
      role: 'viewer',
      createdAt: now.toISOString(),
      expiresAt: now.toISOString(),
    };
    expect(invitationAge(inv, now)).toEqual({ sentDays: 0, expiresDays: 0 });
  });
});

describe('initials', () => {
  it('uses first and last word', () => {
    expect(initials('Ana Popescu')).toBe('AP');
    expect(initials('ana maria popescu')).toBe('AP');
    expect(initials('Ana')).toBe('A');
    expect(initials('  ')).toBe('?');
  });
});
