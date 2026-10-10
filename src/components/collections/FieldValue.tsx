import { Check } from 'lucide-react';
import { type CollectionField, formatFieldValue, isEmptyValue, isHttpLink } from '../../domain/collections';
import type { Currency } from '../../domain/schema';
import { useT } from '../../i18n';

/** Valoarea unui câmp, doar pentru citire: link care se deschide, bifă desenată, gol ca liniuță. */
export function FieldValue({ field, value, currency }: { field: CollectionField; value: unknown; currency: Currency }) {
  const t = useT();
  if (field.type === 'checkbox') {
    return value === true ? (
      <span className="inline-flex items-center gap-1">
        <Check size={14} aria-hidden="true" className="text-plus" />
        {t.collections.yes}
      </span>
    ) : (
      <span className="text-muted">{t.collections.no}</span>
    );
  }
  if (isEmptyValue(value)) return <span className="text-muted">—</span>;
  const text = formatFieldValue(field, value, currency);
  if (field.type === 'link' && isHttpLink(text)) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-accent underline-offset-2 hover:underline"
      >
        {text}
      </a>
    );
  }
  return <span className="break-words">{text}</span>;
}
