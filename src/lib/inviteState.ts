import type { InviteErrorKind, InviteInfo } from './invites';

export type InviteStatus =
  | 'loading'
  | 'valid'
  | 'expired'
  | 'used'
  | 'error'
  | 'accepting'
  | 'declining'
  | 'accepted'
  | 'declined';

export interface InviteState {
  status: InviteStatus;
  info: InviteInfo | null;
  /** Eroarea cererii; în `valid` apare când accept/refuz a eșuat (butoanele rămân active). */
  errorKind: InviteErrorKind | null;
  /** Cererea în curs; rezultatele altor cereri (rămase în urmă) sunt ignorate. */
  requestId: number;
}

export type InviteEvent =
  | { type: 'load'; id: number }
  | { type: 'loaded'; id: number; info: InviteInfo }
  | { type: 'accept'; id: number }
  | { type: 'decline'; id: number }
  | { type: 'done'; id: number }
  | { type: 'failed'; id: number; kind: InviteErrorKind };

export function initialInviteState(status: InviteStatus = 'loading', info: InviteInfo | null = null): InviteState {
  return { status, info, errorKind: null, requestId: 0 };
}

/** Funcție pură: starea paginii de invitație. Efectele (apelul clientului) sunt în componentă. */
export function inviteReducer(state: InviteState, event: InviteEvent): InviteState {
  switch (event.type) {
    case 'load':
      // Și din `error`: cererea se poate repeta.
      return state.status === 'loading' || state.status === 'error'
        ? { ...initialInviteState(), requestId: event.id }
        : state;
    case 'loaded':
      if (event.id !== state.requestId || state.status !== 'loading') return state;
      return { ...state, status: event.info.status, info: event.info, errorKind: null };
    case 'accept':
      return state.status === 'valid' ? { ...state, status: 'accepting', errorKind: null, requestId: event.id } : state;
    case 'decline':
      return state.status === 'valid' ? { ...state, status: 'declining', errorKind: null, requestId: event.id } : state;
    case 'done':
      if (event.id !== state.requestId) return state;
      if (state.status === 'accepting') return { ...state, status: 'accepted' };
      if (state.status === 'declining') return { ...state, status: 'declined' };
      return state;
    case 'failed':
      if (event.id !== state.requestId) return state;
      if (state.status === 'loading') return { ...state, status: 'error', errorKind: event.kind };
      if (state.status === 'accepting' || state.status === 'declining') {
        return { ...state, status: 'valid', errorKind: event.kind };
      }
      return state;
  }
}

/** Cererea e în curs: butoanele se dezactivează. */
export const isBusy = (s: InviteState) => s.status === 'accepting' || s.status === 'declining';
