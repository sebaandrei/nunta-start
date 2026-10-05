import { describe, expect, it } from 'vitest';
import { createInitialData } from '../domain/initial';
import { type AppData, appDataSchema } from '../domain/schema';
import {
  backupFileName,
  loadData,
  needsBackupReminder,
  parseBackup,
  STORAGE_KEY,
  saveData,
  serializeBackup,
} from './storage';

const now = new Date('2026-10-05T10:00:00Z');

function sample(): AppData {
  let n = 0;
  return createInitialData(
    { weddingDate: '2027-09-12', names: ['Ștefania', 'Mihai'], guests: 260 },
    now,
    () => `id${n++}`,
  );
}

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, String(value)),
  };
}

describe('datele inițiale', () => {
  it('sunt valide și pornesc din șablon', () => {
    const data = sample();
    expect(appDataSchema.safeParse(data).success).toBe(true);
    expect(data.budget.scenarios).toEqual([260]);
    expect(data.tasks.length).toBeGreaterThan(40);
    expect(data.budget.lines.every((l) => l.unitPrice === null)).toBe(true);
  });
});

describe('copia descărcabilă', () => {
  it('descărcare + încărcare dă aceleași date', () => {
    const data = sample();
    expect(parseBackup(serializeBackup(data, now))).toEqual({ ok: true, data });
  });

  it('respinge fișierele greșite cu motivul potrivit', () => {
    const valid = JSON.parse(serializeBackup(sample(), now));
    expect(parseBackup('nu e json')).toEqual({ ok: false, error: 'json' });
    expect(parseBackup(JSON.stringify({ ...valid, app: 'altceva' }))).toEqual({ ok: false, error: 'app' });
    expect(parseBackup(JSON.stringify({ ...valid, version: 2 }))).toEqual({ ok: false, error: 'version' });
    expect(parseBackup(JSON.stringify({ ...valid, data: { ...valid.data, tasks: 'x' } }))).toEqual({
      ok: false,
      error: 'shape',
    });
  });

  it('numele fișierului fără diacritice', () => {
    expect(backupFileName(sample(), now)).toBe('nunta-start-stefania-mihai-2026-10-05.json');
  });
});

describe('localStorage', () => {
  it('gol, ok, corupt și indisponibil', () => {
    const data = sample();
    expect(loadData(memoryStorage())).toEqual({ status: 'empty' });
    expect(loadData(memoryStorage({ [STORAGE_KEY]: JSON.stringify(data) }))).toEqual({ status: 'ok', data });
    expect(loadData(memoryStorage({ [STORAGE_KEY]: '{oops' }))).toEqual({ status: 'corrupt', raw: '{oops' });
    expect(loadData(memoryStorage({ [STORAGE_KEY]: '{"a":1}' })).status).toBe('corrupt');
    expect(loadData(null)).toEqual({ status: 'unavailable' });
  });

  it('salvează, șterge și raportează eșecul', () => {
    const storage = memoryStorage();
    expect(saveData(storage, sample())).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(saveData(storage, null)).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();

    const full = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as Storage;
    expect(saveData(full, sample())).toBe(false);
    expect(saveData(null, sample())).toBe(false);
  });
});

describe('reminderul de copie', () => {
  const day = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();

  it('nu apare dacă nimic nu s-a schimbat', () => {
    expect(
      needsBackupReminder({ createdAt: day(0), lastChangedAt: day(0), lastExportedAt: null }, new Date(day(30))),
    ).toBe(false);
  });

  it('apare după 14 zile de la creare, cu modificări și fără copie', () => {
    const meta = { createdAt: day(0), lastChangedAt: day(1), lastExportedAt: null };
    expect(needsBackupReminder(meta, new Date(day(13)))).toBe(false);
    expect(needsBackupReminder(meta, new Date(day(14)))).toBe(true);
  });

  it('se raportează la ultima copie', () => {
    expect(
      needsBackupReminder({ createdAt: day(0), lastChangedAt: day(20), lastExportedAt: day(10) }, new Date(day(23))),
    ).toBe(false);
    expect(
      needsBackupReminder({ createdAt: day(0), lastChangedAt: day(20), lastExportedAt: day(10) }, new Date(day(24))),
    ).toBe(true);
    expect(
      needsBackupReminder({ createdAt: day(0), lastChangedAt: day(5), lastExportedAt: day(10) }, new Date(day(40))),
    ).toBe(false);
  });
});
