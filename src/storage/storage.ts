import { daysBetween, toISODate } from '../domain/dates';
import { type AppData, appDataSchema, type Meta } from '../domain/schema';

export const STORAGE_KEY = 'nunta-start:v1';

/**
 * Cheia planului local, într-un singur loc: cea veche doar când autentificarea e dezactivată,
 * una pe cont când cineva e conectat, niciuna (null) cât timp identitatea nu se știe.
 */
export function storageKeyFor(
  status: 'disabled' | 'unknown' | 'signedOut' | 'signedIn',
  userId: string | null,
): string | null {
  if (status === 'disabled') return STORAGE_KEY;
  return status === 'signedIn' && userId ? `${STORAGE_KEY}:${userId}` : null;
}
export const BACKUP_APP = 'nunta-start';
export const BACKUP_VERSION = 1;
export const BACKUP_REMINDER_DAYS = 14;

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; data: AppData }
  | { status: 'corrupt'; raw: string }
  | { status: 'unavailable' };

/** localStorage, sau null dacă browserul nu lasă scrierea (mod privat, blocat). */
export function getBrowserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = '__nunta-start-probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function loadData(storage: Storage | null, key: string = STORAGE_KEY): LoadResult {
  if (!storage) return { status: 'unavailable' };
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty' };
  try {
    const parsed = appDataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { status: 'ok', data: parsed.data } : { status: 'corrupt', raw };
  } catch {
    return { status: 'corrupt', raw };
  }
}

/** Salvează (sau șterge, pentru null). Întoarce false dacă browserul refuză scrierea. */
export function saveData(storage: Storage | null, data: AppData | null, key: string = STORAGE_KEY): boolean {
  if (!storage) return false;
  try {
    if (data) storage.setItem(key, JSON.stringify(data));
    else storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function serializeBackup(data: AppData, now: Date): string {
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data }, null, 2);
}

export type BackupError = 'json' | 'app' | 'version' | 'shape';
export type ParseBackupResult = { ok: true; data: AppData } | { ok: false; error: BackupError };

export function parseBackup(text: string): ParseBackupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'json' };
  }
  if (!isRecord(json) || json.app !== BACKUP_APP) return { ok: false, error: 'app' };
  if (json.version !== BACKUP_VERSION) return { ok: false, error: 'version' };
  const parsed = appDataSchema.safeParse(json.data);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: 'shape' };
}

export function backupFileName(data: AppData, now: Date): string {
  const slug = data.settings.names.map(slugify).filter(Boolean).join('-') || 'nunta';
  return `nunta-start-${slug}-${toISODate(now)}.json`;
}

/** Date modificate după ultima copie, iar copia (sau crearea) e mai veche de 14 zile. */
export function needsBackupReminder(meta: Meta, now: Date): boolean {
  const since = new Date(meta.lastExportedAt ?? meta.createdAt);
  const changed = new Date(meta.lastChangedAt);
  if (changed.getTime() <= since.getTime()) return false;
  return daysBetween(since, now) >= BACKUP_REMINDER_DAYS;
}

export function daysSinceBackup(meta: Meta, now: Date): number | null {
  return meta.lastExportedAt ? daysBetween(new Date(meta.lastExportedAt), now) : null;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
