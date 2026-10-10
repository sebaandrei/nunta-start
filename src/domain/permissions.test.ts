import { describe, expect, it } from 'vitest';
import { ROLES } from '../lib/workspaces';
import { canEdit, MODULES } from './permissions';

describe('canEdit', () => {
  it('lets the viewer read only', () => {
    for (const m of MODULES) expect(canEdit('viewer', m)).toBe(false);
  });

  it('lets the helper edit tasks, guests and custom pages only', () => {
    expect(canEdit('helper', 'tasks')).toBe(true);
    expect(canEdit('helper', 'guests')).toBe(true);
    expect(canEdit('helper', 'pages')).toBe(true);
    expect(canEdit('helper', 'budget')).toBe(false);
    expect(canEdit('helper', 'settings')).toBe(false);
  });

  it('lets owner, partner and planner edit everything', () => {
    for (const role of ['owner', 'partner', 'planner'] as const) {
      for (const m of MODULES) expect(canEdit(role, m)).toBe(true);
    }
  });

  it('answers for every role and module', () => {
    for (const r of ROLES) for (const m of MODULES) expect(typeof canEdit(r, m)).toBe('boolean');
  });
});
