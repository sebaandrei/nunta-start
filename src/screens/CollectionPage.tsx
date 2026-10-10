import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { FileQuestion, ListPlus, Pencil, Plus, Rows3, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FieldEditor } from '../components/collections/FieldEditor';
import { NameDialog } from '../components/collections/NameDialog';
import { RecordCards } from '../components/collections/RecordCards';
import { RecordSheet } from '../components/collections/RecordSheet';
import { RecordTable } from '../components/collections/RecordTable';
import { PageHeader } from '../components/PageHeader';
import { Banner, Button, EmptyState } from '../components/ui';
import { useCollectionActions } from '../data/collectionActions';
import { useCollectionFields, useCollectionRecords, useCollections, useSettings } from '../data/hooks';
import type { ServerCollection } from '../data/mappers';
import { applyPatch, type CollectionField, isEmptyValue, ofCollection, validateRecord } from '../domain/collections';
import { useT } from '../i18n';
import { routes } from '../lib/paths';
import { showToast } from '../lib/toast';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useWedding } from '../lib/wedding';

/** O pagină proprie, găsită după slug (adresa nu se schimbă la redenumire). */
export function CollectionPage() {
  const t = useT();
  const { slug } = useParams({ strict: false });
  const { id: weddingId } = useWedding();
  const collection = useCollections(weddingId).find((c) => c.slug === slug);
  if (!collection) {
    return (
      <EmptyState
        icon={FileQuestion}
        title={t.collections.missingTitle}
        action={
          <Link to={routes.pages} params={{ weddingId }} className="text-sm font-medium text-accent hover:underline">
            {t.collections.backToPages}
          </Link>
        }
      >
        {t.collections.missingHint}
      </EmptyState>
    );
  }
  return <CollectionView key={collection.id} collection={collection} />;
}

function CollectionView({ collection }: { collection: ServerCollection }) {
  const t = useT();
  const navigate = useNavigate();
  const { id: weddingId, canEdit } = useWedding();
  const { displayCurrency } = useSettings();
  const fields = ofCollection(useCollectionFields(weddingId), collection.id);
  const records = ofCollection(useCollectionRecords(weddingId), collection.id);
  const actions = useCollectionActions(weddingId);
  const readOnly = !canEdit('pages');
  const mobile = !useMediaQuery('(min-width: 768px)');
  const [editingFields, setEditingFields] = useState(false);
  const [renaming, setRenaming] = useState(false);
  // 'new' = înregistrare nouă; altfel id-ul celei deschise.
  const [sheet, setSheet] = useState<string | null>(null);
  const sheetRecord = sheet && sheet !== 'new' ? (records.find((r) => r.id === sheet) ?? null) : null;
  const sheetOpen = sheet === 'new' || sheetRecord !== null;

  /** Editare pe loc: întreaga înregistrare se validează înainte de trimitere; o eroare se spune, iar câmpul revine. */
  const commitCell = (recordId: string, field: CollectionField, value: unknown) => {
    const record = records.find((r) => r.id === recordId);
    if (!record) return;
    const patch = { [field.key]: isEmptyValue(value) ? null : value };
    const [key, error] = Object.entries(validateRecord(fields, applyPatch(record.data, patch)))[0] ?? [];
    if (key && error) {
      showToast(`${fields.find((f) => f.key === key)?.label}: ${t.collections.errors[error]}`);
      return;
    }
    actions.patchRecord(recordId, patch);
  };

  return (
    <>
      <PageHeader
        title={collection.name}
        action={
          readOnly || fields.length === 0 ? undefined : (
            <Button onClick={() => setSheet('new')}>
              <Plus size={16} aria-hidden="true" />
              {t.collections.addRecord}
            </Button>
          )
        }
      />
      {readOnly && <Banner className="mb-6">{t.collections.readOnly}</Banner>}

      {!readOnly && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setEditingFields(true)}>
            <Rows3 size={16} aria-hidden="true" />
            {t.collections.editFields}
          </Button>
          <Button variant="ghost" onClick={() => setRenaming(true)}>
            <Pencil size={16} aria-hidden="true" />
            {t.collections.rename}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(t.collections.confirmRemovePage(collection.name, records.length))) {
                void navigate({ to: routes.pages, params: { weddingId } });
                actions.removeCollection(collection.id);
              }
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            {t.collections.removePage}
          </Button>
        </div>
      )}

      {fields.length === 0 ? (
        <EmptyState
          icon={ListPlus}
          title={readOnly ? t.collections.noFieldsReadOnly : t.collections.noFieldsTitle}
          action={
            readOnly ? undefined : (
              <Button onClick={() => setEditingFields(true)}>
                <Rows3 size={16} aria-hidden="true" />
                {t.collections.editFields}
              </Button>
            )
          }
        >
          {readOnly ? undefined : t.collections.noFieldsHint}
        </EmptyState>
      ) : records.length === 0 ? (
        <EmptyState
          icon={ListPlus}
          title={t.collections.emptyRecordsTitle}
          action={
            readOnly ? undefined : (
              <Button onClick={() => setSheet('new')}>
                <Plus size={16} aria-hidden="true" />
                {t.collections.addRecord}
              </Button>
            )
          }
        >
          {readOnly ? undefined : t.collections.emptyRecordsHint}
        </EmptyState>
      ) : mobile ? (
        <RecordCards fields={fields} records={records} currency={displayCurrency} onOpen={setSheet} />
      ) : (
        <RecordTable
          fields={fields}
          records={records}
          currency={displayCurrency}
          readOnly={readOnly}
          onCommit={(record, field, value) => commitCell(record.id, field, value)}
          onOpen={setSheet}
          onRemove={actions.removeRecord}
        />
      )}

      <RecordSheet
        open={sheetOpen}
        fields={fields}
        record={sheetRecord}
        currency={displayCurrency}
        readOnly={readOnly}
        onSave={(data, patch) =>
          sheetRecord ? actions.patchRecord(sheetRecord.id, patch) : actions.addRecord(collection.id, data)
        }
        onRemove={() => sheetRecord && actions.removeRecord(sheetRecord.id)}
        onClose={() => setSheet(null)}
      />
      <FieldEditor
        open={editingFields}
        collectionId={collection.id}
        fields={fields}
        actions={actions}
        onClose={() => setEditingFields(false)}
      />
      <NameDialog
        open={renaming}
        title={t.collections.renameTitle}
        submitLabel={t.collections.save}
        initial={collection.name}
        onSubmit={(name) => actions.renameCollection(collection.id, name)}
        onClose={() => setRenaming(false)}
      />
    </>
  );
}
