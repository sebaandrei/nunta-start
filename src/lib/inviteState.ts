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
  /** Tokenul invitației afișate; accept/refuz pentru alt token sunt ignorate. */
  token: string;
  /** Cererea în curs; rezultatele altor cereri (rămase în urmă) sunt ignorate. */
  requestId: number;
}

export type InviteEvent =
  | { type: 'load'; id: number; token: string }
  | { type: 'loaded'; id: number; info: InviteInfo }
  | { type: 'accept'; id: number; token: string }
  | { type: 'decline'; id: number; token: string }
  | { type: 'done'; id: number }
  | { type: 'failed'; id: number; kind: InviteErrorKind };

export function initialInviteState(
  status: InviteStatus = 'loading',
  info: InviteInfo | null = null,
  token = '',
): InviteState {
  return { status, info, errorKind: null, token, requestId: 0 };
}

/** Funcție pură: starea paginii de invitație. Efectele (apelul clientului) sunt în componentă. */
export function inviteReducer(state: InviteState, event: InviteEvent): InviteState {
  switch (event.type) {
    case 'load':
      // Din orice stare: token nou sau reîncercare. Invitația anterioară se aruncă, iar rezultatele ei întârziate sunt ignorate.
      return { ...initialInviteState('loading', null, event.token), requestId: event.id };
    case 'loaded':
      if (event.id !== state.requestId || state.status !== 'loading') return state;
      return { ...state, status: event.info.status, info: event.info, errorKind: null };
    case 'accept':
      return state.status === 'valid' && event.token === state.token
        ? { ...state, status: 'accepting', errorKind: null, requestId: event.id }
        : state;
    case 'decline':
      return state.status === 'valid' && event.token === state.token
        ? { ...state, status: 'declining', errorKind: null, requestId: event.id }
        : state;
    case 'done':
      if (event.id !== state.requestId) return state;
      if (state.status === 'accepting') return { ...state, status: 'accepted' };
      if (state.status === 'declining') return { ...state, status: 'declined' };
      return state;
    case 'failed':
      if (event.id !== state.requestId) return state;
      if (state.status === 'loading') return { ...state, status: 'error', errorKind: event.kind };
      if (state.status === 'accepting' || state.status === 'declining') {
        // Invitația s-a schimbat între timp: pagina arată starea ei reală, nu o eroare cu butoane active.
        if (event.kind === 'expired' || event.kind === 'used') {
          const info = state.info && { ...state.info, status: event.kind };
          return { ...state, status: event.kind, info, errorKind: null };
        }
        return { ...state, status: 'valid', errorKind: event.kind };
      }
      return state;
  }
}

/** Cererea e în curs: butoanele se dezactivează. */
export const isBusy = (s: InviteState) => s.status === 'accepting' || s.status === 'declining';

/** Contul conectat nu e cel pentru care s-a trimis invitația (adresele se compară fără diferența mari/mici). */
export function emailsDiffer(signedIn: string | null, invited: string | null): boolean {
  return Boolean(signedIn && invited && signedIn.trim().toLowerCase() !== invited.trim().toLowerCase());
}
