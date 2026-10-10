import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { CollectionActions } from '../../data/collectionActions';
import type { ServerCollectionField } from '../../data/mappers';
import { FIELD_TYPES, type FieldType, parseOptions } from '../../domain/collections';
import { useT } from '../../i18n';
import { Button, Card, CommitInput, Field, IconButton, Select, Tag, TextInput } from '../ui';
import { Sheet } from './Sheet';

const nonEmpty = (value: string) => value.trim() !== '';

function FieldRow({
  field,
  first,
  last,
  actions,
}: {
  field: ServerCollectionField;
  first: boolean;
  last: boolean;
  actions: CollectionActions;
}) {
  const t = useT();
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CommitInput
          aria-label={t.collections.fieldLabel}
          value={field.label}
          validate={nonEmpty}
          onCommit={(label) => actions.updateField(field.id, { label: label.trim() })}
          className="min-w-0 flex-1 basis-40"
        />
        <Tag>{t.collections.types[field.type]}</Tag>
        <label className="flex min-h-11 items-center gap-1.5 text-sm md:min-h-9">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => actions.updateField(field.id, { required: e.target.checked })}
            className="size-4 accent-accent"
          />
          {t.collections.fieldRequired}
        </label>
        <IconButton label={t.collections.moveFieldUp} disabled={first} onClick={() => actions.moveField(field.id, -1)}>
          <ArrowUp size={16} aria-hidden="true" />
        </IconButton>
        <IconButton label={t.collections.moveFieldDown} disabled={last} onClick={() => actions.moveField(field.id, 1)}>
          <ArrowDown size={16} aria-hidden="true" />
        </IconButton>
        <IconButton
          label={t.collections.removeField}
          onClick={() => {
            if (window.confirm(t.collections.confirmRemoveField(field.label))) actions.removeField(field.id);
          }}
        >
          <Trash2 size={16} aria-hidden="true" />
        </IconButton>
      </div>
      {field.type === 'choice' && (
        <CommitInput
          aria-label={t.collections.fieldOptions}
          placeholder={t.collections.fieldOptions}
          value={field.options.join(', ')}
          validate={(text) => parseOptions(text).length > 0}
          onCommit={(text) => actions.updateField(field.id, { options: parseOptions(text) })}
          className="mt-2"
        />
      )}
    </Card>
  );
}

/** Câmpurile unei pagini: redenumire, obligatoriu, opțiuni, ordine, ștergere și adăugare. Tipul nu se mai schimbă după creare. */
export function FieldEditor({
  open,
  collectionId,
  fields,
  actions,
  onClose,
}: {
  open: boolean;
  collectionId: string;
  fields: ServerCollectionField[];
  actions: CollectionActions;
  onClose: () => void;
}) {
  const t = useT();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState('');
  const options = parseOptions(optionsText);
  const canAdd = nonEmpty(label) && (type !== 'choice' || options.length > 0);

  const add = () => {
    if (!canAdd) return;
    actions.addField(collectionId, { label: label.trim(), type, required, options });
    setLabel('');
    setRequired(false);
    setOptionsText('');
  };

  return (
    <Sheet open={open} title={t.collections.fieldsTitle} onClose={onClose}>
      <ul className="mt-4 space-y-2">
        {fields.map((field, index) => (
          <li key={field.id}>
            <FieldRow field={field} first={index === 0} last={index === fields.length - 1} actions={actions} />
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
        <Field label={t.collections.fieldLabel} className="col-span-2">
          <TextInput
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
        </Field>
        <Field label={t.collections.fieldType}>
          <Select value={type} onChange={(e) => setType(FIELD_TYPES.find((v) => v === e.target.value) ?? 'text')}>
            {FIELD_TYPES.map((v) => (
              <option key={v} value={v}>
                {t.collections.types[v]}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex min-h-11 items-end gap-1.5 pb-2 text-sm md:min-h-9">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="size-4 accent-accent"
          />
          {t.collections.fieldRequired}
        </label>
        {type === 'choice' && (
          <Field label={t.collections.fieldOptions} className="col-span-2">
            <TextInput value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
          </Field>
        )}
        <div className="col-span-2 flex justify-end gap-2">
          <Button variant="secondary" disabled={!canAdd} onClick={add}>
            <Plus size={16} aria-hidden="true" />
            {t.collections.addField}
          </Button>
          <Button onClick={onClose}>{t.collections.done}</Button>
        </div>
      </div>
    </Sheet>
  );
}
