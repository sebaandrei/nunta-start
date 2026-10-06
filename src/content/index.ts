import { z } from 'zod';
import { categorySchema, currencySchema } from '../domain/schema';
import { currentLocale, type Locale } from '../lib/locale';
import budgetEn from './en/budget.json';
import tasksEn from './en/tasks.json';
import budgetRo from './ro/budget.json';
import tasksRo from './ro/tasks.json';

export const templateTaskSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  category: categorySchema,
  daysBefore: z.number().int(),
  details: z.string().default(''),
});

export const budgetDefaultSchema = z.object({
  name: z.string().min(1),
  currency: currencySchema,
  perGuest: z.boolean(),
});

export type TemplateTask = z.infer<typeof templateTaskSchema>;
export type BudgetDefault = z.infer<typeof budgetDefaultSchema>;

/** Aceleași id-uri în ambele limbi; doar textele diferă. Datele utilizatorului nu depind de limbă. */
export const TASK_TEMPLATES: Record<Locale, TemplateTask[]> = {
  ro: z.array(templateTaskSchema).parse(tasksRo),
  en: z.array(templateTaskSchema).parse(tasksEn),
};
export const BUDGET_DEFAULTS_BY_LOCALE: Record<Locale, BudgetDefault[]> = {
  ro: z.array(budgetDefaultSchema).parse(budgetRo),
  en: z.array(budgetDefaultSchema).parse(budgetEn),
};

export function taskTemplate(locale: Locale = currentLocale()): TemplateTask[] {
  return TASK_TEMPLATES[locale];
}

export function budgetDefaults(locale: Locale = currentLocale()): BudgetDefault[] {
  return BUDGET_DEFAULTS_BY_LOCALE[locale];
}
