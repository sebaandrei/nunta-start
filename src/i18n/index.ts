import { currentLocale, type Locale, useLocale } from '../lib/locale';
import { en } from './en';
import { ro } from './ro';

/** Forma mesajelor: orice limbă nouă trebuie să o respecte, altfel typecheck eșuează. */
export type Messages = typeof ro;

const messages: Record<Locale, Messages> = { ro, en };

/** Mesajele limbii active acum, pentru cod care nu e componentă (store, erori). */
export function getMessages(locale: Locale = currentLocale()): Messages {
  return messages[locale];
}

/** Mesajele limbii curente; componenta se redesenează când se schimbă limba. */
export function useT(): Messages {
  return messages[useLocale((s) => s.locale)];
}
