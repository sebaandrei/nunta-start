import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ServerCollectionField, ServerCollectionRecord } from '../../data/mappers';
import {
  type CollectionField,
  diffRecord,
  type FieldError,
  type RecordData,
  type RecordPatch,
  validateRecord,
  withCheckboxDefaults,
  withoutEmpty,
} from '../../domain/collections';
import type { Currency } from '../../domain/schema';
import { useT } from '../../i18n';
import { currencySymbol } from '../../lib/format';
import { Button, Field, NumberInput, Select, TextInput } from '../ui';
import { Sheet } from './Sheet';

function DraftInput({
  field,
  value,
  disabled,
  currency,
  onChange,
}: {
  field: CollectionField;
  value: unknown;
  disabled: boolean;
  currency: Currency;
  onChange: (value: unknown) => void;
}) {
  const t = useT();
  switch (field.type) {
    case 'number':
    case 'money':
      return (
        <div className="flex items-center gap-2">
          <NumberInput
            value={typeof value === 'number' ? value : null}
            onChange={onChange}
            disabled={disabled}
            className="text-right"
          />
          {field.type === 'money' && <span className="text-sm text-muted">{currencySymbol(currency)}</span>}
        </div>
      );
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={value === true}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="size-5 accent-accent"
        />
      );
    case 'choice':
      return (
        <Select
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
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
        <TextInput
          type={field.type === 'date' ? 'date' : field.type === 'link' ? 'url' : 'text'}
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function RecordForm({
  fields,
  record,
  currency,
  readOnly,
  onSave,
  onRemove,
  onClose,
}: {
  fields: ServerCollectionField[];
  record: ServerCollectionRecord | null;
  currency: Currency;
  readOnly: boolean;
  onSave: (data: RecordData, patch: RecordPatch) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = useT();
  // Starea de la deschidere: se trimit doar cheile schimbate față de ea, ca să nu calce editările altora.
  const [base] = useState<RecordData>(record?.data ?? {});
  const [draft, setDraft] = useState<RecordData>(base);
  const [errors, setErrors] = useState<Record<string, FieldError>>({});

  const save = () => {
    const data = withCheckboxDefaults(fields, withoutEmpty(draft));
    const found = validateRecord(fields, data);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave(data, diffRecord(base, data));
    onClose();
  };

  return (
    <>
      <div className="mt-4 grid gap-3">
        {fields.map((field) => {
          const error = errors[field.key];
          return (
            <Field
              key={field.id}
              label={field.required ? `${field.label} *` : field.label}
              hint={error && <span className="text-minus">{t.collections.errors[error]}</span>}
            >
              <DraftInput
                field={field}
                value={draft[field.key]}
                disabled={readOnly}
                currency={currency}
                onChange={(value) => setDraft((d) => ({ ...d, [field.key]: value }))}
              />
            </Field>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {readOnly ? (
          <Button onClick={onClose}>{t.collections.done}</Button>
        ) : (
          <>
            {record && (
              <Button
                variant="danger"
                className="mr-auto"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
                {t.collections.removeRecord}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              {t.collections.cancel}
            </Button>
            <Button onClick={save}>{t.collections.save}</Button>
          </>
        )}
      </div>
    </>
  );
}

/** Formularul unei înregistrări (nouă sau existentă): se validează la „Salvează", înainte de drumul spre server. */
export function RecordSheet({
  open,
  fields,
  record,
  currency,
  readOnly,
  onSave,
  onRemove,
  onClose,
}: {
  open: boolean;
  fields: ServerCollectionField[];
  /** null = înregistrare nouă. */
  record: ServerCollectionRecord | null;
  currency: Currency;
  readOnly: boolean;
  onSave: (data: RecordData, patch: RecordPatch) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Sheet open={open} title={record ? t.collections.editRecord : t.collections.newRecord} onClose={onClose}>
      <RecordForm
        key={record?.id ?? 'new'}
        fields={fields}
        record={record}
        currency={currency}
        readOnly={readOnly}
        onSave={onSave}
        onRemove={onRemove}
        onClose={onClose}
      />
    </Sheet>
  );
}
