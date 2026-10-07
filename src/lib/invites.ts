import type { Messages } from '../i18n';
import type { Role } from './workspaces';

/** Cât timp e valabilă o invitație (NS-050); textele paginii îl iau de aici. */
export const INVITE_LIFETIME_DAYS = 14;

export type InviteStatus = 'valid' | 'expired' | 'used';

export interface InviteInfo {
  status: InviteStatus;
  /** Numele spațiului, de ex. „Ana & Mihai". */
  workspaceName: string;
  inviterName: string;
  role: Role;
  /** Data nunții (ISO) și locul, dacă sunt cunoscute. */
  date: string | null;
  city: string | null;
  /** Adresa pentru care s-a trimis invitația. */
  email: string | null;
}

/**
 * Clientul invitațiilor, injectat în pagina de acceptare.
 * Implementarea reală (RPC-urile din Supabase) e în src/data/invites.ts.
 */
export interface InvitesClient {
  inspect(token: string): Promise<InviteInfo>;
  accept(token: string): Promise<void>;
  decline(token: string): Promise<void>;
}

/** Invitațiile nu sunt configurate încă. */
export class InvitesNotConfiguredError extends Error {
  constructor() {
    super('Invitations are not configured');
    this.name = 'InvitesNotConfiguredError';
  }
}

/** Contul conectat nu e cel pentru care s-a trimis invitația. */
export class InvitesWrongAccountError extends Error {
  constructor() {
    super('Invitation is for another account');
    this.name = 'InvitesWrongAccountError';
  }
}

/** Cererea nu a ajuns la server. */
export class InvitesNetworkError extends Error {
  constructor() {
    super('Network error');
    this.name = 'InvitesNetworkError';
  }
}

/** Clientul implicit: refuză sincer, ca interfața să nu pretindă niciodată că a primit o invitație. */
export const notConfiguredInvitesClient: InvitesClient = {
  inspect: () => Promise.reject(new InvitesNotConfiguredError()),
  accept: () => Promise.reject(new InvitesNotConfiguredError()),
  decline: () => Promise.reject(new InvitesNotConfiguredError()),
};

export type InviteErrorKind = 'notConfigured' | 'network' | 'wrongAccount' | 'generic';

export function inviteErrorKind(error: unknown): InviteErrorKind {
  if (error instanceof InvitesNotConfiguredError) return 'notConfigured';
  if (error instanceof InvitesWrongAccountError) return 'wrongAccount';
  if (error instanceof InvitesNetworkError || error instanceof TypeError) return 'network';
  return 'generic';
}

export function inviteErrorMessage(kind: InviteErrorKind, t: Messages): string {
  return t.invite.errors[kind];
}
