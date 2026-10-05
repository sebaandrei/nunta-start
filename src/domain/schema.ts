import { z } from 'zod';

export const CURRENCIES = ['EUR', 'RON'] as const;
export const OWNERS = ['p1', 'p2', 'both'] as const;
export const STATUSES = ['todo', 'doing', 'done'] as const;
export const CATEGORY_IDS = [
  'buget',
  'invitati',
  'locatie',
  'muzica',
  'foto',
  'decor',
  'print',
  'tinute',
  'acte',
  'ziua',
  'altele',
] as const;

export const currencySchema = z.enum(CURRENCIES);
export const ownerSchema = z.enum(OWNERS);
export const statusSchema = z.enum(STATUSES);
export const categorySchema = z.enum(CATEGORY_IDS);
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  category: categorySchema,
  owner: ownerSchema,
  status: statusSchema,
  /** Offsetul din șablon, în zile înainte de nuntă (negativ = după). */
  daysBefore: z.number().int().nullable(),
  /** Termen pus de mână; are prioritate față de daysBefore. */
  manualDate: isoDateSchema.nullable(),
  details: z.string(),
  note: z.string(),
});

export const quantitySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('perGuest') }),
  z.object({ kind: z.literal('fixed'), count: z.number().nonnegative() }),
]);

export const moneySchema = z.object({
  amount: z.number().nonnegative().nullable(),
  currency: currencySchema,
});

export const budgetLineSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  unitPrice: z.number().nonnegative().nullable(),
  currency: currencySchema,
  quantity: quantitySchema,
  paid: z.number().nonnegative().nullable(),
  note: z.string(),
});

export const budgetSchema = z
  .object({
    scenarios: z.array(z.number().int().positive()).min(1).max(4),
    selected: z.number().int().nonnegative(),
    giftPerGuest: moneySchema,
    familyGift: moneySchema,
    lines: z.array(budgetLineSchema),
  })
  .refine((b) => b.selected < b.scenarios.length, {
    message: 'selected must point to an existing scenario',
    path: ['selected'],
  });

export const settingsSchema = z.object({
  weddingDate: isoDateSchema,
  names: z.tuple([z.string(), z.string()]),
  /** Câți lei face 1 €. */
  eurRate: z.number().positive(),
  displayCurrency: currencySchema,
});

export const metaSchema = z.object({
  createdAt: z.string(),
  lastChangedAt: z.string(),
  lastExportedAt: z.string().nullable(),
});

export const appDataSchema = z.object({
  settings: settingsSchema,
  tasks: z.array(taskSchema),
  budget: budgetSchema,
  meta: metaSchema,
});

export type Currency = z.infer<typeof currencySchema>;
export type Owner = z.infer<typeof ownerSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Task = z.infer<typeof taskSchema>;
export type Money = z.infer<typeof moneySchema>;
export type BudgetLine = z.infer<typeof budgetLineSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type AppData = z.infer<typeof appDataSchema>;
