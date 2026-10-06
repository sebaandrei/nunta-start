import { type Locale, useLocale } from '../lib/locale';
import { en } from './en';
import { ro } from './ro';

/** Forma mesajelor: orice limbă nouă trebuie să o respecte, altfel typecheck eșuează. */
export type Messages = typeof ro;

const messages: Record<Locale, Messages> = { ro, en };

/** Mesajele limbii curente; componenta se redesenează când se schimbă limba. */
export function useT(): Messages {
  return messages[useLocale((s) => s.locale)];
}
