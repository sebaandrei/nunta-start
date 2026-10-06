-- NS-043: amount already paid on a budget line, in the line's own currency (budget_lines.currency).
-- Nullable: null means nothing recorded. Payments by installment (NS-090) arrive later with a
-- separate module that will replace this column.
alter table public.budget_lines
  add column paid numeric(12, 2) check (paid >= 0);
