import { describe, expect, it } from 'vitest';
import { addDays, parseISODate } from '../domain/dates';
import { STAGE_IDS, stageOf } from '../domain/tasks';
import { LOCALES } from '../lib/locale';
import { BUDGET_DEFAULTS_BY_LOCALE, localizeTemplateText, TASK_TEMPLATES } from './index';

describe.each(LOCALES)('șablonul de taskuri (%s)', (locale) => {
  const template = TASK_TEMPLATES[locale];

  it('are id-uri și titluri unice', () => {
    const ids = template.map((t) => t.id);
    const titles = template.map((t) => t.title);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('acoperă fiecare etapă', () => {
    const wedding = parseISODate('2027-09-12');
    const stages = new Set(template.map((t) => stageOf(addDays(wedding, -t.daysBefore), wedding)));
    expect([...stages].sort()).toEqual([...STAGE_IDS].sort());
  });

  it('are termene rezonabile', () => {
    for (const t of template) {
      expect(t.daysBefore).toBeLessThanOrEqual(540);
      expect(t.daysBefore).toBeGreaterThanOrEqual(-120);
    }
  });
});

describe.each(LOCALES)('liniile de buget (%s)', (locale) => {
  it('au nume unice', () => {
    const names = BUDGET_DEFAULTS_BY_LOCALE[locale].map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('paritatea între limbi', () => {
  it('taskurile au aceleași id-uri, în aceeași ordine, cu aceleași câmpuri non-text', () => {
    const strip = (l: (typeof LOCALES)[number]) =>
      TASK_TEMPLATES[l].map((t) => ({
        id: t.id,
        category: t.category,
        daysBefore: t.daysBefore,
        hasDetails: !!t.details,
      }));
    expect(strip('en')).toEqual(strip('ro'));
  });

  it('liniile de buget au aceeași monedă și același tip, în aceeași ordine', () => {
    const strip = (l: (typeof LOCALES)[number]) =>
      BUDGET_DEFAULTS_BY_LOCALE[l].map((b) => ({ currency: b.currency, perGuest: b.perGuest }));
    expect(strip('en')).toEqual(strip('ro'));
  });
});

describe('localizeTemplateText', () => {
  const ro = TASK_TEMPLATES.ro[0];
  const en = TASK_TEMPLATES.en[0];

  it('traduce textul needitat în limba cerută', () => {
    expect(localizeTemplateText(ro.id, 'title', ro.title, 'en')).toBe(en.title);
    expect(localizeTemplateText(en.id, 'details', en.details, 'ro')).toBe(ro.details);
  });

  it('lasă în pace textul editat, taskurile proprii și cheile necunoscute', () => {
    expect(localizeTemplateText(ro.id, 'title', 'Titlul meu', 'en')).toBe('Titlul meu');
    expect(localizeTemplateText(null, 'title', ro.title, 'en')).toBe(ro.title);
    expect(localizeTemplateText('nu-exista', 'title', ro.title, 'en')).toBe(ro.title);
  });
});
