import { describe, expect, it } from 'vitest';
import { createInitialData } from '../domain/initial';
import type { AppData } from '../domain/schema';
import { getMessages } from '../i18n';
import {
  coupleName,
  createLocalWorkspacesClient,
  dateAndCity,
  LOCAL_WORKSPACE_ID,
  localWorkspace,
  ROLES,
  roleLabel,
  workspaceInitials,
} from './workspaces';

const data = (patch: Partial<AppData['settings']> = {}): AppData => {
  const d = createInitialData({ weddingDate: '2027-01-23', names: ['Ana', 'Mihai'], guests: null }, new Date());
  return { ...d, settings: { ...d.settings, ...patch } };
};

describe('ROLES', () => {
  it('matches the database member_role enum', () => {
    expect([...ROLES]).toEqual(['owner', 'partner', 'planner', 'helper', 'viewer']);
  });
});

describe('roleLabel', () => {
  it('has a distinct Romanian and English label for every role', () => {
    const ro = ROLES.map((r) => roleLabel(r, getMessages('ro')));
    expect(ro).toEqual(['Proprietar', 'Partener', 'Planner', 'Ajutor', 'Cititor']);
    const en = ROLES.map((r) => roleLabel(r, getMessages('en')));
    expect(new Set(en).size).toBe(ROLES.length);
  });
});

describe('coupleName', () => {
  it('joins two names, tolerates blanks', () => {
    expect(coupleName(['Ana', 'Mihai'])).toBe('Ana & Mihai');
    expect(coupleName([' Ana ', ''])).toBe('Ana');
    expect(coupleName(['', ' '])).toBe('');
  });
});

describe('localWorkspace', () => {
  it('is null without local data', () => {
    expect(localWorkspace(null)).toBeNull();
  });
  it('derives name, date, city and the owner role from settings', () => {
    expect(localWorkspace(data({ city: ' Brașov ' }))).toEqual({
      id: LOCAL_WORKSPACE_ID,
      name: 'Ana & Mihai',
      date: '2027-01-23',
      city: 'Brașov',
      role: 'owner',
    });
  });
  it('leaves the city empty when blank', () => {
    expect(localWorkspace(data({ city: '  ' }))?.city).toBeNull();
  });
});

describe('createLocalWorkspacesClient', () => {
  it('lists the single local wedding, or nothing', async () => {
    expect(await createLocalWorkspacesClient(() => null).list()).toEqual([]);
    const list = await createLocalWorkspacesClient(() => data()).list();
    expect(list).toHaveLength(1);
    expect(list[0].role).toBe('owner');
  });
});

describe('workspaceInitials', () => {
  it('uses both initials for a couple and two letters for a single name', () => {
    expect(workspaceInitials('Ana & Mihai')).toBe('A&M');
    expect(workspaceInitials('Nunta Cristinei')).toBe('NU');
    expect(workspaceInitials('')).toBe('');
  });
});

describe('dateAndCity', () => {
  it('formats date and city, omitting what is missing or invalid', () => {
    expect(dateAndCity('2027-01-23', 'Brașov')).toBe('23 ianuarie 2027 · Brașov');
    expect(dateAndCity('2027-01-23', null)).toBe('23 ianuarie 2027');
    expect(dateAndCity(null, ' Cluj ')).toBe('Cluj');
    expect(dateAndCity('nope', null)).toBe('');
  });
});
