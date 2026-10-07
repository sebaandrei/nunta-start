-- NS-070: households + guests + RLS.
-- Read: any member. Write: owner, partner, planner, helper (not viewer).
-- Diet is a menu preference only (no allergies, no free text).

create table public.households (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null,
  side text not null default 'both' check (side in ('p1', 'p2', 'both')),
  notes text not null default '',
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  unique (id, wedding_id)
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  household_id uuid not null,
  first_name text not null default '',
  last_name text not null default '',
  age_group text not null default 'adult' check (age_group in ('adult', 'child')),
  diet text not null default 'classic' check (diet in ('classic', 'vegetarian', 'vegan')),
  attending text not null default 'unknown' check (attending in ('unknown', 'yes', 'no')),
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  -- The household must belong to the same wedding.
  foreign key (household_id, wedding_id)
    references public.households (id, wedding_id)
    on delete cascade
);

create index households_wedding_idx on public.households (wedding_id);
create index guests_wedding_idx on public.guests (wedding_id);
create index guests_household_idx on public.guests (household_id);

create trigger households_set_audit
  before update on public.households
  for each row execute function private.set_audit_columns();
create trigger guests_set_audit
  before update on public.guests
  for each row execute function private.set_audit_columns();

create trigger households_immutable_wedding
  before update on public.households
  for each row execute function private.forbid_column_change('wedding_id');
create trigger guests_immutable_wedding
  before update on public.guests
  for each row execute function private.forbid_column_change('wedding_id');

alter table public.households enable row level security;
alter table public.guests enable row level security;

create policy households_select_member on public.households
  for select to authenticated
  using (private.member_role(wedding_id) is not null);
create policy households_insert_editors on public.households
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy households_update_editors on public.households
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy households_delete_editors on public.households
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));

create policy guests_select_member on public.guests
  for select to authenticated
  using (private.member_role(wedding_id) is not null);
create policy guests_insert_editors on public.guests
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy guests_update_editors on public.guests
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy guests_delete_editors on public.guests
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
