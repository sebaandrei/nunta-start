import { describe, expect, it } from 'vitest';
import { exportFileName } from './exportData';

describe('exportFileName', () => {
  it('puts the local date in the name', () => {
    expect(exportFileName(new Date(2026, 9, 8, 23, 30))).toBe('nunta-start-date-2026-10-08.json');
  });
});
