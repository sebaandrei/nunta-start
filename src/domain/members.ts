import { validateEmail } from '../lib/auth';

/** Rolurile unui spațiu, de la cel mai puternic la cel mai limitat. */
export const ROLES = ['owner', 'partner', 'planner', 'helper', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Membrul este utilizatorul curent. */
  isSelf: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
}

/** Rolurile pe care `actor` le poate atribui sau administra. Proprietarul nu se atribuie și nu se administrează. */
export function manageableRoles(actor: Pick<Member, 'role'>): Role[] {
  switch (actor.role) {
    case 'owner':
    case 'partner':
      return ['partner', 'planner', 'helper', 'viewer'];
    case 'planner':
      return ['helper', 'viewer'];
    default:
      return [];
  }
}

/** Poate `actor` administra (schimba rolul / scoate) pe `target`? Nu pe sine și niciodată un proprietar. */
function canManage(actor: Member, target: Member): boolean {
  return actor.id !== target.id && target.role !== 'owner' && manageableRoles(actor).includes(target.role);
}

export function canChangeRole(actor: Member, target: Member, newRole: Role): boolean {
  return canManage(actor, target) && newRole !== target.role && manageableRoles(actor).includes(newRole);
}

export function canRemove(actor: Member, target: Member): boolean {
  return canManage(actor, target);
}

/** Oricine în afară de proprietar poate pleca; proprietarul niciodată (deci nici ultimul proprietar). */
export function canLeave(member: Member, members: Member[]): boolean {
  if (member.role === 'owner') return false;
  return members.some((m) => m.id === member.id);
}

export type InviteIssue = 'empty' | 'invalid' | 'duplicate' | 'member';

const norm = (email: string) => email.trim().toLowerCase();

/** Validează adresa unei invitații: format, apoi invitație deja în așteptare sau persoană deja membră. */
export function validateInvite(raw: string, members: Member[], pending: Invitation[]): InviteIssue | null {
  const format = validateEmail(raw);
  if (format) return format;
  const email = norm(raw);
  if (members.some((m) => norm(m.email) === email)) return 'member';
  if (pending.some((i) => norm(i.email) === email)) return 'duplicate';
  return null;
}

/** Schimbă rolul unui membru, imutabil (folosit pentru interfața optimistă). */
export function withRole(members: Member[], id: string, role: Role): Member[] {
  return members.map((m) => (m.id === id ? { ...m, role } : m));
}

const DAY_MS = 86_400_000;

/** Zile de la trimitere (0 = azi) și zile rămase până la expirare. */
export function invitationAge(inv: Invitation, now: Date): { sentDays: number; expiresDays: number } {
  return {
    sentDays: Math.max(0, Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / DAY_MS)),
    expiresDays: Math.ceil((new Date(inv.expiresAt).getTime() - now.getTime()) / DAY_MS),
  };
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? [parts[0]] : [parts[0], parts[parts.length - 1]];
  return letters.map((p) => p.charAt(0).toUpperCase()).join('');
}
