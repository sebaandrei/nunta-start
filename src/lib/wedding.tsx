import { useSuspenseQuery } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import type { Wedding } from '../data/mappers';
import { weddingQuery } from '../data/queries';
import { canEdit, type Module } from '../domain/permissions';
import { NoAccess } from '../screens/ErrorPages';
import { isWeddingId } from './paths';
import type { Role } from './workspaces';

export interface WeddingContextValue {
  id: string;
  wedding: Wedding;
  role: Role;
  /** Poate rolul meu să modifice modulul? (oglindește RLS; serverul rămâne autoritatea). */
  canEdit: (module: Module) => boolean;
}

const WeddingContext = createContext<WeddingContextValue | null>(null);

/**
 * Nunta din adresă, cu rolul meu. Dacă nu sunt membru (RLS nu întoarce nimic) sau id-ul nu e valid,
 * arată pagina „fără acces" în loc de ecrane.
 */
export function WeddingProvider({ weddingId, children }: { weddingId: string; children: ReactNode }) {
  if (!isWeddingId(weddingId)) return <NoAccess />;
  return <Loaded weddingId={weddingId}>{children}</Loaded>;
}

function Loaded({ weddingId, children }: { weddingId: string; children: ReactNode }) {
  const { data: wedding } = useSuspenseQuery(weddingQuery(weddingId));
  const value = useMemo<WeddingContextValue | null>(
    () =>
      wedding && {
        id: wedding.id,
        wedding,
        role: wedding.role,
        canEdit: (module) => canEdit(wedding.role, module),
      },
    [wedding],
  );
  if (!value) return <NoAccess />;
  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>;
}

export function useWedding(): WeddingContextValue {
  const value = useContext(WeddingContext);
  if (!value) throw new Error('useWedding must be used inside <WeddingProvider>');
  return value;
}
