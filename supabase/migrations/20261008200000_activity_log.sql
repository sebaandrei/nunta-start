-- NS-056: audit log. Every insert, update and delete on the wedding tables writes one row.
-- Clients can only read it (any member); rows are written by the trigger and removed by the purge.
-- Personal data: updates store only the changed fields, and guest names and free-text
-- notes are never copied into the log.

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  entity text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  summary jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index activity_log_wedding_created_idx on public.activity_log (wedding_id, created_at);

alter table public.activity_log enable row level security;
revoke all on public.activity_log from anon, authenticated;
grant select on public.activity_log to authenticated;

create policy activity_log_select_member on public.activity_log
  for select to authenticated
  using (private.member_role(wedding_id) is not null);

-- summary: insert/delete = the row, update = {column: {"old": .., "new": ..}} for changed columns.
-- Bookkeeping columns and personal text (guest names, household family names, notes, details) are left out.
create function private.write_activity_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  skip text[] := array['created_at', 'updated_at', 'updated_by', 'first_name', 'last_name', 'notes', 'note', 'details']
    || case when tg_table_name = 'households' then array['name'] else '{}'::text[] end;
  old_row jsonb := to_jsonb(old) - skip;
  new_row jsonb := to_jsonb(new) - skip;
  rec jsonb := coalesce(new_row, old_row);
  wid uuid := (rec ->> 'wedding_id')::uuid;
  eid uuid := coalesce(rec ->> 'id', rec ->> 'wedding_id')::uuid;
  diff jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('old', old_row -> n.key, 'new', n.value)), '{}')
      into diff
      from jsonb_each(new_row) n
      where old_row -> n.key is distinct from n.value;
    if diff = '{}' then
      return null;
    end if;
  end if;

  -- A cascading wedding delete removes children after the wedding: nothing to attach a row to.
  if not exists (select 1 from public.weddings where id = wid) then
    return null;
  end if;

  insert into public.activity_log (wedding_id, actor_id, entity, entity_id, action, summary)
  values (wid, (select auth.uid()), tg_table_name, eid, lower(tg_op), case tg_op when 'UPDATE' then diff else rec end);
  return null;
end;
$$;

revoke all on function private.write_activity_log() from public;

create trigger tasks_activity
  after insert or update or delete on public.tasks
  for each row execute function private.write_activity_log();
create trigger budget_scenarios_activity
  after insert or update or delete on public.budget_scenarios
  for each row execute function private.write_activity_log();
create trigger budget_settings_activity
  after insert or update or delete on public.budget_settings
  for each row execute function private.write_activity_log();
create trigger budget_lines_activity
  after insert or update or delete on public.budget_lines
  for each row execute function private.write_activity_log();
create trigger households_activity
  after insert or update or delete on public.households
  for each row execute function private.write_activity_log();
create trigger guests_activity
  after insert or update or delete on public.guests
  for each row execute function private.write_activity_log();

-- Retention: 180 days.
create function private.purge_activity_log()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.activity_log where created_at < now() - interval '180 days';
$$;

revoke all on function private.purge_activity_log() from public;

-- Daily purge with pg_cron, only where the extension is available so `db reset` never fails.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('purge-activity-log', '17 3 * * *', 'select private.purge_activity_log()');
  end if;
end;
$$;
