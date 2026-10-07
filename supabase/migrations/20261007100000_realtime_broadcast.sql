-- NS-053: live collaboration. Row changes on tasks and budget tables are broadcast to the
-- private channel `wedding:<wedding_id>`; only members of that wedding may listen.

create function private.broadcast_wedding_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
begin
  perform realtime.send(
    jsonb_build_object('table', tg_table_name, 'op', tg_op, 'record', rec),
    tg_op,
    'wedding:' || (rec ->> 'wedding_id'),
    true
  );
  return null;
end;
$$;

revoke all on function private.broadcast_wedding_change() from public;

create trigger tasks_broadcast
  after insert or update or delete on public.tasks
  for each row execute function private.broadcast_wedding_change();
create trigger budget_scenarios_broadcast
  after insert or update or delete on public.budget_scenarios
  for each row execute function private.broadcast_wedding_change();
create trigger budget_settings_broadcast
  after insert or update or delete on public.budget_settings
  for each row execute function private.broadcast_wedding_change();
create trigger budget_lines_broadcast
  after insert or update or delete on public.budget_lines
  for each row execute function private.broadcast_wedding_change();

-- Receiving: a member may read broadcast messages of their own wedding channel only.
-- A row is visible only on its own topic, so a direct select cannot read another wedding's
-- messages. The regex guard keeps a malformed topic from raising a cast error.
create policy wedding_members_receive_broadcast on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.messages.topic = realtime.topic()
    and realtime.topic() ~ '^wedding:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.member_role(split_part(realtime.topic(), ':', 2)::uuid) is not null
  );
