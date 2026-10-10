import { ChevronRight } from 'lucide-react';
import type { ServerCollectionField, ServerCollectionRecord } from '../../data/mappers';
import { formatFieldValue, isEmptyValue } from '../../domain/collections';
import type { Currency } from '../../domain/schema';
import { useT } from '../../i18n';
import { FieldValue } from './FieldValue';

/** Înregistrările pe telefon: o carte atingibilă pe înregistrare (primul câmp e titlul), care deschide foaia de editare. */
export function RecordCards({
  fields,
  records,
  currency,
  onOpen,
}: {
  fields: ServerCollectionField[];
  records: ServerCollectionRecord[];
  currency: Currency;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const [first, ...rest] = fields;
  return (
    <ul className="space-y-3">
      {records.map((record) => {
        const title = first ? formatFieldValue(first, record.data[first.key], currency) : '';
        return (
          <li key={record.id}>
            <button
              type="button"
              onClick={() => onOpen(record.id)}
              aria-label={`${t.collections.editRecord}: ${title || t.collections.untitledRecord}`}
              className="flex min-h-11 w-full items-start gap-2 rounded-2xl border border-line bg-surface p-4 text-left"
            >
              <span className="min-w-0 flex-1">
                <span
                  className={
                    title ? 'block truncate font-serif text-lg' : 'block truncate font-serif text-lg text-muted'
                  }
                >
                  {title || t.collections.untitledRecord}
                </span>
                <dl className="mt-1 space-y-0.5 text-sm">
                  {rest
                    .filter((field) => !isEmptyValue(record.data[field.key]))
                    .map((field) => (
                      <div key={field.id} className="flex gap-2">
                        <dt className="shrink-0 text-muted">{field.label}:</dt>
                        <dd className="min-w-0">
                          <FieldValue field={field} value={record.data[field.key]} currency={currency} />
                        </dd>
                      </div>
                    ))}
                </dl>
              </span>
              <ChevronRight size={16} className="mt-1.5 shrink-0 text-muted" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
