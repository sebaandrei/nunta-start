import { type Invitation, type Member, ROLES, type Role } from '../domain/members';
import type { MembersClient } from './members';

/**
 * Doar pentru teste unitare și pentru previzualizarea din dev (`?members=demo`).
 * Panoul îl importă numai sub `import.meta.env.DEV`, deci nu ajunge în build-ul de producție.
 */
const DAY = 86_400_000;

export function demoMembers(selfRole: Role = 'owner'): Member[] {
  const base: Member[] = [
    { id: 'm1', name: 'Ana Popescu', email: 'ana@exemplu.ro', role: 'owner', isSelf: false },
    { id: 'm2', name: 'Mihai Ionescu', email: 'mihai@exemplu.ro', role: 'partner', isSelf: false },
    { id: 'm3', name: 'Cristina Radu', email: 'cristina@exemplu.ro', role: 'planner', isSelf: false },
    { id: 'm4', name: 'Maria Pop', email: 'maria@exemplu.ro', role: 'viewer', isSelf: false },
  ];
  if (selfRole === 'owner') return base.map((m) => ({ ...m, isSelf: m.id === 'm1' }));
  // Utilizatorul curent e primul membru cu rolul cerut; Ana rămâne proprietar.
  const self = base.find((m) => m.role === selfRole) ?? { ...base[3], role: selfRole };
  return base.map((m) => ({ ...m, isSelf: m.id === self.id }));
}

export function demoInvitations(now = new Date()): Invitation[] {
  const at = (days: number) => new Date(now.getTime() + days * DAY).toISOString();
  return [
    { id: 'i1', email: 'radu.mihai@exemplu.ro', role: 'viewer', createdAt: at(-2), expiresAt: at(5) },
    { id: 'i2', email: 'tata.ana@exemplu.ro', role: 'helper', createdAt: at(0), expiresAt: at(7) },
  ];
}

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 250));

/**
 * Client în memorie. Pentru a vedea stările de eroare: o invitație către o adresă care începe cu „fail@",
 * sau schimbarea rolului lui Maria Pop, sunt respinse.
 */
export function createFakeMembersClient(selfRole: Role = 'owner'): MembersClient {
  let members = demoMembers(selfRole);
  let invitations = demoInvitations();
  let seq = 100;
  const fail = () => Promise.reject(new TypeError('network'));
  return {
    async list() {
      await delay();
      return members;
    },
    async listInvitations() {
      await delay();
      return invitations;
    },
    async invite(email, role) {
      await delay();
      if (email.startsWith('fail@')) return fail();
      const now = new Date();
      const inv = {
        id: `i${seq++}`,
        email,
        role,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 7 * DAY).toISOString(),
      };
      invitations = [...invitations, inv];
      return inv;
    },
    async cancelInvite(id) {
      await delay();
      invitations = invitations.filter((i) => i.id !== id);
    },
    async changeRole(memberId, role) {
      await delay();
      if (memberId === 'm4') return fail();
      members = members.map((m) => (m.id === memberId ? { ...m, role } : m));
    },
    async remove(memberId) {
      await delay();
      members = members.filter((m) => m.id !== memberId);
    },
    async leave() {
      await delay();
    },
  };
}

/** `?members=demo` (și, opțional, `&as=planner`): rolul din perspectiva căruia se vede panoul. */
export function parseMembersPreview(search: string): { selfRole: Role } | null {
  const params = new URLSearchParams(search);
  if (params.get('members') !== 'demo') return null;
  const as = params.get('as');
  return { selfRole: ROLES.find((r) => r === as) ?? 'owner' };
}
