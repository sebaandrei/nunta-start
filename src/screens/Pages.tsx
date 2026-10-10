import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRight, FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import { NameDialog } from '../components/collections/NameDialog';
import { PageHeader } from '../components/PageHeader';
import { Banner, Button, Card, EmptyState } from '../components/ui';
import { useCollectionActions } from '../data/collectionActions';
import { useCollectionRecords, useCollections } from '../data/hooks';
import { useT } from '../i18n';
import { pageRoute } from '../lib/paths';
import { useWedding } from '../lib/wedding';

/** Lista paginilor proprii ale nunții, cu acțiunea „Pagină nouă". */
export function Pages() {
  const t = useT();
  const { id: weddingId, canEdit } = useWedding();
  const collections = useCollections(weddingId);
  const records = useCollectionRecords(weddingId);
  const actions = useCollectionActions(weddingId);
  const navigate = useNavigate();
  const readOnly = !canEdit('pages');
  const [creating, setCreating] = useState(false);

  const create = (name: string) =>
    actions
      .addCollection(name)
      .then((collection) => navigate({ to: pageRoute, params: { weddingId, slug: collection.slug } }))
      .catch(() => {}); // eroarea o arată deja toast-ul global

  return (
    <>
      <PageHeader
        title={t.collections.listTitle}
        subtitle={t.collections.listSubtitle}
        action={
          readOnly ? undefined : (
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />
              {t.collections.newPage}
            </Button>
          )
        }
      />
      {readOnly && <Banner className="mb-6">{t.collections.readOnly}</Banner>}

      {collections.length === 0 ? (
        <EmptyState icon={FileText} title={t.collections.emptyPagesTitle}>
          {t.collections.emptyPagesHint}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {collections.map((collection) => (
            <li key={collection.id}>
              <Link
                to={pageRoute}
                params={{ weddingId, slug: collection.slug }}
                aria-label={t.collections.openPage(collection.name)}
                className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Card className="flex min-h-11 items-center gap-3 p-4 transition-colors hover:bg-sunken">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-lg">{collection.name}</span>
                    <span className="block text-xs text-muted">
                      {t.collections.recordCount(records.filter((r) => r.collectionId === collection.id).length)}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NameDialog
        open={creating}
        title={t.collections.newPage}
        submitLabel={t.collections.create}
        onSubmit={create}
        onClose={() => setCreating(false)}
      />
    </>
  );
}
