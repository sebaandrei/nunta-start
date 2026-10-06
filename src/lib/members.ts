import type { Invitation, Member, Role } from '../domain/members';

/**
 * Clientul de colaborare, injectat în panoul „Membri și invitații".
 * Implementarea reală (membri și invitații în Supabase) vine cu NS-050 – NS-052.
 */
export interface MembersClient {
  list(): Promise<Member[]>;
  /** Adăugat peste contractul din plan: panoul are nevoie și de invitațiile în așteptare. */
  listInvitations(): Promise<Invitation[]>;
  invite(email: string, role: Role): Promise<Invitation>;
  cancelInvite(id: string): Promise<void>;
  changeRole(memberId: string, role: Role): Promise<void>;
  remove(memberId: string): Promise<void>;
  leave(): Promise<void>;
}

/** Colaborarea nu e configurată încă. */
export class MembersNotConfiguredError extends Error {
  constructor() {
    super('Collaboration is not configured');
    this.name = 'MembersNotConfiguredError';
  }
}

/**
 * Clientul implicit: refuză sincer, ca interfața să nu pretindă niciodată că a trimis o invitație.
 * Lista de invitații în așteptare nu se poate citi, deci panoul o arată goală.
 */
export const notConfiguredMembersClient: MembersClient = {
  list: () => Promise.reject(new MembersNotConfiguredError()),
  listInvitations: () => Promise.reject(new MembersNotConfiguredError()),
  invite: () => Promise.reject(new MembersNotConfiguredError()),
  cancelInvite: () => Promise.reject(new MembersNotConfiguredError()),
  changeRole: () => Promise.reject(new MembersNotConfiguredError()),
  remove: () => Promise.reject(new MembersNotConfiguredError()),
  leave: () => Promise.reject(new MembersNotConfiguredError()),
};
