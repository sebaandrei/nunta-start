-- NS-029: budget_settings, budget_scenarios (1-4 per wedding), budget_lines + RLS.
-- Read: any member. Write: owner, partner, planner (helper and viewer are read-only).
-- budget_lines has no `paid` column: payments arrive with NS-090. vendor_id is a plain
-- nullable uuid until the vendors table exists (the FK is added in that migration).

create table public.budget_scenarios (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  guests integer not null check (guests > 0),
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  unique (id, wedding_id)
);

create index budget_scenarios_wedding_idx on public.budget_scenarios (wedding_id);

create table public.budget_settings (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  gift_per_guest numeric(12, 2) check (gift_per_guest >= 0),
  gift_per_guest_currency public.currency not null default 'RON',
  family_gift numeric(12, 2) check (family_gift >= 0),
  family_gift_currency public.currency not null default 'RON',
  selected_scenario_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  -- The selected scenario must belong to the same wedding.
  foreign key (selected_scenario_id, wedding_id)
    references public.budget_scenarios (id, wedding_id)
    on delete set null (selected_scenario_id)
);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null,
  unit_price numeric(12, 2) check (unit_price >= 0),
  currency public.currency not null default 'RON',
  qty_kind text not null default 'per_guest' check (qty_kind in ('per_guest', 'fixed')),
  qty_count numeric check (qty_count >= 0),
  note text not null default '',
  vendor_id uuid,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  check (qty_kind <> 'fixed' or qty_count is not null)
);

create index budget_lines_wedding_idx on public.budget_lines (wedding_id);

create trigger budget_scenarios_set_audit
  before update on public.budget_scenarios
  for each row execute function private.set_audit_columns();
create trigger budget_settings_set_audit
  before update on public.budget_settings
  for each row execute function private.set_audit_columns();
create trigger budget_lines_set_audit
  before update on public.budget_lines
  for each row execute function private.set_audit_columns();

create trigger budget_scenarios_immutable_wedding
  before update on public.budget_scenarios
  for each row execute function private.forbid_column_change('wedding_id');
create trigger budget_settings_immutable_wedding
  before update on public.budget_settings
  for each row execute function private.forbid_column_change('wedding_id');
create trigger budget_lines_immutable_wedding
  before update on public.budget_lines
  for each row execute function private.forbid_column_change('wedding_id');

-- 1-4 scenarios per wedding. Security definer so the count ignores RLS.
create function private.enforce_scenario_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Serialize concurrent inserts for the same wedding.
    perform 1 from public.weddings where id = new.wedding_id for update;
    if (select count(*) from public.budget_scenarios where wedding_id = new.wedding_id) >= 4 then
      raise exception 'a wedding can have at most 4 budget scenarios'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- DELETE: keep at least one. Take the same wedding row lock as the insert path so two
  -- concurrent deletes cannot both see count = 2. When the wedding itself is being deleted
  -- (cascade) its row is already gone for this transaction, nothing is found, and we skip.
  perform 1 from public.weddings where id = old.wedding_id for update;
  if found
     and (select count(*) from public.budget_scenarios where wedding_id = old.wedding_id) <= 1 then
    raise exception 'a wedding must keep at least 1 budget scenario'
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger budget_scenarios_limits
  before insert or delete on public.budget_scenarios
  for each row execute function private.enforce_scenario_limits();

alter table public.budget_scenarios enable row level security;
alter table public.budget_settings enable row level security;
alter table public.budget_lines enable row level security;

create policy budget_scenarios_select_member on public.budget_scenarios
  for select to authenticated
  using (private.member_role(wedding_id) is not null);
create policy budget_scenarios_insert_editors on public.budget_scenarios
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]));
create policy budget_scenarios_update_editors on public.budget_scenarios
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]));
create policy budget_scenarios_delete_editors on public.budget_scenarios
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]));

create policy budget_settings_select_member on public.budget_settings
  for select to authenticated
  using (private.member_role(wedding_id) is not null);
create policy budget_settings_insert_editors on public.budget_settings
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]));
create policy budget_settings_update_editors on public.budget_settings
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]));
create policy budget_settings_delete_editors on public.budget_settings
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]));

create policy budget_lines_select_member on public.budget_lines
  for select to authenticated
  using (private.member_role(wedding_id) is not null);
create policy budget_lines_insert_editors on public.budget_lines
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]));
create policy budget_lines_update_editors on public.budget_lines
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]));
create policy budget_lines_delete_editors on public.budget_lines
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner']::public.member_role[]));
