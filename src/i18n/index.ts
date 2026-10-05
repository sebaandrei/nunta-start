import { ro } from './ro';

/** Forma mesajelor: orice limbă nouă trebuie să o respecte, altfel typecheck eșuează. */
export type Messages = typeof ro;

const messages: Messages = ro;

export function useT(): Messages {
  return messages;
}
