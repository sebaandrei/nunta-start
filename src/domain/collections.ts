import { decimalDisplay, formatDate, formatMoney } from '../lib/format';
import { isValidISODate, parseISODate } from './dates';
import type { Currency } from './schema';

/** Tipurile câmpurilor unei pagini proprii: exact cele acceptate de triggerul din DB (NS-303). */
export const FIELD_TYPES = ['text', 'number', 'money', 'date', 'choice', 'checkbox', 'person', 'link'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** Datele unei înregistrări: valoarea fiecărui câmp, după cheia lui. */
export type RecordData = Record<string, unknown>;

/** Slug-ul îl generează DB la creare și nu se mai schimbă; la redenumire adresa rămâne aceeași. */
export type Collection = { id: string; name: string; slug: string };
export type CollectionField = {
  id: string;
  collectionId: string;
  /** Cheia din `RecordData`; nu se schimbă după creare, ca să nu se piardă valorile. */
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Valorile unui câmp de tip „choice"; gol pentru celelalte tipuri. */
  options: string[];
};
export type CollectionRecord = { id: string; collectionId: string; data: RecordData };

export type FieldError = 'required' | 'number' | 'link' | 'date' | 'choice' | 'invalid';

const HTTP_LINK = /^https?:\/\/\S+$/i;

export const isHttpLink = (value: string) => HTTP_LINK.test(value);

/** Gol pentru DB: lipsă, null sau șirul gol. */
export const isEmptyValue = (value: unknown) => value === undefined || value === null || value === '';

function typeError(field: CollectionField, value: unknown): FieldError | null {
  switch (field.type) {
    case 'text':
    case 'person':
      return typeof value === 'string' ? null : 'invalid';
    case 'number':
    case 'money':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'number';
    case 'checkbox':
      return typeof value === 'boolean' ? null : 'invalid';
    case 'link':
      return typeof value === 'string' && isHttpLink(value) ? null : 'link';
    case 'choice':
      return typeof value === 'string' && field.options.includes(value) ? null : 'choice';
    case 'date':
      return typeof value === 'string' && isValidISODate(value) ? null : 'date';
  }
}

/** Oglindește triggerul `validate_collection_record`: ce câmpuri sunt greșite, după cheie. Gol = valid. */
export function validateRecord(fields: readonly CollectionField[], data: RecordData): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {};
  for (const field of fields) {
    const value = data[field.key];
    const error = isEmptyValue(value) ? (field.required ? 'required' : null) : typeError(field, value);
    if (error) errors[field.key] = error;
  }
  return errors;
}

/** Data fără valorile goale (DB le tratează la fel ca lipsa lor). */
export function withoutEmpty(data: RecordData): RecordData {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => !isEmptyValue(value)));
}

/** O casetă obligatorie bifată pe nimic e „nu": cheia lipsă devine `false`, ca formularul să poată salva ce arată. */
export function withCheckboxDefaults(fields: readonly CollectionField[], data: RecordData): RecordData {
  const out = { ...data };
  for (const field of fields) {
    if (field.type === 'checkbox' && field.required && out[field.key] === undefined) out[field.key] = false;
  }
  return out;
}

/** Schimbare parțială a unei înregistrări: cheie -> valoare nouă, `null` = golit. */
export type RecordPatch = Record<string, unknown>;

/** Cheile care diferă între `base` și `next` (golurile se compară ca lipsa), cu `null` pentru cele golite. */
export function diffRecord(base: RecordData, next: RecordData): RecordPatch {
  const [from, to] = [withoutEmpty(base), withoutEmpty(next)];
  const patch: RecordPatch = {};
  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
    if (JSON.stringify(from[key]) !== JSON.stringify(to[key])) patch[key] = to[key] ?? null;
  }
  return patch;
}

/** Rezultatul aplicării lui `patch` peste `data`, ca îl calculează serverul (golurile dispar). */
export function applyPatch(data: RecordData, patch: RecordPatch): RecordData {
  return withoutEmpty({ ...data, ...patch });
}

/** Cheia unui câmp nou, din etichetă: litere mici ASCII, cifre și `_`, unică între `taken` (regula din DB: `^[a-z][a-z0-9_]*$`). */
export function fieldKeyFor(label: string, taken: readonly string[]): string {
  let base = label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (base === '') base = 'camp';
  else if (!/^[a-z]/.test(base)) base = `f_${base}`;
  let key = base;
  for (let n = 2; taken.includes(key); n++) key = `${base}_${n}`;
  return key;
}

/** Opțiunile dintr-un text separat prin virgulă: fără goluri și fără dubluri. */
export function parseOptions(text: string): string[] {
  return [...new Set(text.split(',').map((option) => option.trim()))].filter(Boolean);
}

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/** Câmpurile (sau înregistrările) unei pagini, în ordinea ei. */
export function ofCollection<T extends { collectionId: string; position: number }>(
  items: readonly T[],
  collectionId: string,
): T[] {
  return items.filter((item) => item.collectionId === collectionId).sort(byPosition);
}

/** Valoarea pentru afișare; gol pentru lipsă și pentru bifă (aceea se desenează). */
export function formatFieldValue(field: CollectionField, value: unknown, currency: Currency): string {
  if (isEmptyValue(value) || typeError(field, value)) return '';
  switch (field.type) {
    case 'money':
      return formatMoney(value as number, currency);
    case 'number':
      return decimalDisplay(value as number);
    case 'date':
      return formatDate(parseISODate(value as string));
    case 'checkbox':
      return '';
    default:
      return String(value);
  }
}
