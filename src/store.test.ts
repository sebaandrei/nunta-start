import { afterEach, describe, expect, it } from 'vitest';
import { useLocale } from './lib/locale';
import { useStore } from './store';

afterEach(() => useLocale.getState().setLocale('ro'));

describe('addLine', () => {
  it('folosește numele implicit în limba activă la momentul apelului', () => {
    useStore.getState().start({ weddingDate: '2027-09-12', names: ['A', 'B'], guests: null });
    const name = (id: string) => useStore.getState().data?.budget.lines.find((l) => l.id === id)?.name;

    expect(name(useStore.getState().addLine())).toBe('Linie nouă');
    useLocale.getState().setLocale('en');
    expect(name(useStore.getState().addLine())).toBe('New line');
  });

  it('start creează șablonul în limba activă la trimitere', () => {
    useLocale.getState().setLocale('en');
    useStore.getState().start({ weddingDate: '2027-09-12', names: ['A', 'B'], guests: null });
    expect(useStore.getState().data?.budget.lines[0].name).toBe('Menu');
  });
});
