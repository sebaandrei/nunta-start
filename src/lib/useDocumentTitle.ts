import { useEffect } from 'react';

/** Titlul complet al filei: „Pagina · Nunta Start". */
export function pageTitle(page: string, appName: string): string {
  return `${page} · ${appName}`;
}

/** Pune titlul filei cât e montată componenta și îl restaurează la demontare (navigare client-side). */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
