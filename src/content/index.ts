import { z } from 'zod';
import { categorySchema, currencySchema } from '../domain/schema';
import budgetJson from './budget.ro.json';
import tasksJson from './tasks.ro.json';

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

export const TASK_TEMPLATE: TemplateTask[] = z.array(templateTaskSchema).parse(tasksJson);
export const BUDGET_DEFAULTS: BudgetDefault[] = z.array(budgetDefaultSchema).parse(budgetJson);
