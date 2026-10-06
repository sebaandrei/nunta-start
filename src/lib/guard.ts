import type { SessionStatus } from './session';

export type GuardDecision = { type: 'allow' } | { type: 'wait' } | { type: 'redirectToLogin'; next: string };

/** Funcție pură: ce se întâmplă când cineva deschide o cale din /w. */
export function guardDecision({
  configured,
  status,
  path,
}: {
  configured: boolean;
  status: SessionStatus;
  path: string;
}): GuardDecision {
  if (!configured || status === 'disabled') return { type: 'allow' };
  if (status === 'unknown') return { type: 'wait' };
  return status === 'signedOut' ? { type: 'redirectToLogin', next: path } : { type: 'allow' };
}
