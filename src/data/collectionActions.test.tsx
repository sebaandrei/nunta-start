import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { keys } from '../lib/queryKeys';
import { type CollectionActions, useCollectionActions } from './collectionActions';

vi.mock('./collections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./collections')>()),
  deleteCollection: vi.fn().mockRejectedValue(new Error('network down')),
  deleteCollectionField: vi.fn().mockRejectedValue(new Error('network down')),
}));

const weddingId = 'w1';

/** Captura acțiunilor fără a monta nimic: ca după ce pagina s-a demontat, `mutate` nu mai are observator activ. */
function actionsOf(queryClient: QueryClient): CollectionActions {
  let actions: CollectionActions | undefined;
  function Probe() {
    actions = useCollectionActions(weddingId);
    return null;
  }
  renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  );
  if (!actions) throw new Error('actions not captured');
  return actions;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('collection deletes recover their caches without a mounted observer', () => {
  it('reloads fields and records when a page delete fails', async () => {
    const queryClient = new QueryClient();
    const k = keys.wedding(weddingId);
    queryClient.setQueryData(k.collections(), [{ id: 'c1' }]);
    queryClient.setQueryData(k.collectionFields(), [{ id: 'f1', collectionId: 'c1', key: 'nume' }]);
    queryClient.setQueryData(k.collectionRecords(), [{ id: 'r1', collectionId: 'c1', data: {} }]);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    actionsOf(queryClient).removeCollection('c1');
    await settle();

    const invalidated = invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
    expect(invalidated).toContain(JSON.stringify(k.collectionFields()));
    expect(invalidated).toContain(JSON.stringify(k.collectionRecords()));
  });

  it('reloads records when a field delete fails', async () => {
    const queryClient = new QueryClient();
    const k = keys.wedding(weddingId);
    queryClient.setQueryData(k.collectionFields(), [{ id: 'f1', collectionId: 'c1', key: 'nume' }]);
    queryClient.setQueryData(k.collectionRecords(), [{ id: 'r1', collectionId: 'c1', data: { nume: 'x' } }]);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    actionsOf(queryClient).removeField('f1');
    await settle();

    const invalidated = invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
    expect(invalidated).toContain(JSON.stringify(k.collectionRecords()));
  });
});
