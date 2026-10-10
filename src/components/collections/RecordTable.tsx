import { Pencil, Trash2 } from 'lucide-react';
import type { ServerCollectionField, ServerCollectionRecord } from '../../data/mappers';
import type { CollectionField } from '../../domain/collections';
import type { Currency } from '../../domain/schema';
import { useT } from '../../i18n';
import { currencySymbol } from '../../lib/format';
import { CommitInput, IconButton, NumberInput, Select } from '../ui';
import { FieldValue } from './FieldValue';

/** Câmpul unei înregistrări, editabil pe loc; fiecare tip își trimite valoarea la blur sau la schimbare (null = golit). */
function CellEditor({
  field,
  value,
  currency,
  onCommit,
}: {
  field: CollectionField;
  value: unknown;
  currency: Currency;
  onCommit: (value: unknown) => void;
}) {
  const t = useT();
  const label = field.label;
  switch (field.type) {
    case 'number':
    case 'money':
      return (
        <div className="flex items-center gap-1">
          <NumberInput
            variant="inline"
            aria-label={label}
            deferred
            required={field.required}
            value={typeof value === 'number' ? value : null}
            onChange={onCommit}
            className="w-28 text-right"
          />
          {field.type === 'money' && <span className="text-xs text-muted">{currencySymbol(currency)}</span>}
        </div>
      );
    case 'checkbox':
      return (
        <input
          type="checkbox"
          aria-label={label}
          checked={value === true}
          onChange={(e) => onCommit(e.target.checked)}
          className="size-4 accent-accent"
        />
      );
    case 'choice':
      return (
        <Select
          aria-label={label}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onCommit(e.target.value)}
          className="w-40"
        >
          <option value="">{t.collections.noChoice}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );
    default:
      return (
        <CommitInput
          variant="inline"
          aria-label={label}
          type={field.type === 'date' ? 'date' : 'text'}
          value={typeof value === 'string' ? value : ''}
          onCommit={onCommit}
          className="w-full min-w-36"
        />
      );
  }
}

/** Înregistrările pe desktop: un rând pe înregistrare, o coloană pe câmp, editare pe loc. */
export function RecordTable({
  fields,
  records,
  currency,
  readOnly,
  onCommit,
  onOpen,
  onRemove,
}: {
  fields: ServerCollectionField[];
  records: ServerCollectionRecord[];
  currency: Currency;
  readOnly: boolean;
  onCommit: (record: ServerCollectionRecord, field: CollectionField, value: unknown) => void;
  /** Deschide înregistrarea întreagă într-o foaie: singura cale de a o corecta când mai multe câmpuri sunt invalide. */
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const t = useT();
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {fields.map((field) => (
              <th
                key={field.id}
                scope="col"
                className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted"
              >
                {field.label}
                {field.required && ' *'}
              </th>
            ))}
            {!readOnly && (
              <th scope="col" className="w-24">
                <span className="sr-only">{t.collections.editRecord}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {records.map((record) => (
            <tr key={record.id}>
              {fields.map((field) => (
                <td key={field.id} className="px-1.5 py-1.5 align-middle">
                  {readOnly ? (
                    <div className="px-2 py-1">
                      <FieldValue field={field} value={record.data[field.key]} currency={currency} />
                    </div>
                  ) : (
                    <CellEditor
                      field={field}
                      value={record.data[field.key]}
                      currency={currency}
                      onCommit={(value) => onCommit(record, field, value)}
                    />
                  )}
                </td>
              ))}
              {!readOnly && (
                <td className="whitespace-nowrap px-1.5 py-1.5 text-right">
                  <IconButton label={t.collections.editRecord} onClick={() => onOpen(record.id)}>
                    <Pencil size={16} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={t.collections.removeRecord} onClick={() => onRemove(record.id)}>
                    <Trash2 size={16} aria-hidden="true" />
                  </IconButton>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
