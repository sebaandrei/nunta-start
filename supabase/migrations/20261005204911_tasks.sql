-- NS-028: tasks + RLS.
-- Read: any member. Write: owner, partner, planner, helper (not viewer).

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  template_key text,
  title text not null,
  category text not null check (category in (
    'buget', 'invitati', 'locatie', 'muzica', 'foto', 'decor',
    'print', 'tinute', 'acte', 'ziua', 'altele'
  )),
  assignee text not null default 'both' check (assignee in ('p1', 'p2', 'both')),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  days_before integer,
  manual_date date,
  details text not null default '',
  note text not null default '',
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index tasks_wedding_idx on public.tasks (wedding_id);

create trigger tasks_set_audit
  before update on public.tasks
  for each row execute function private.set_audit_columns();

alter table public.tasks enable row level security;

create policy tasks_select_member on public.tasks
  for select to authenticated
  using (private.member_role(wedding_id) is not null);

create policy tasks_insert_editors on public.tasks
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));

create policy tasks_update_editors on public.tasks
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));

create policy tasks_delete_editors on public.tasks
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
