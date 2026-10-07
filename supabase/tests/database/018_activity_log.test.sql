begin;
select plan(14);

insert into public.allowed_emails (email) values
  ('a1@example.com'),
  ('a3@example.com');

-- a1 owner of W1, a3 outsider
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com');
insert into public.weddings (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'W1');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner');

-- Writes made as the owner, so auth.uid() is recorded as the actor.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

insert into public.households (id, wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Popescu');
insert into public.guests (id, wedding_id, household_id, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Ana', 'Popescu');
update public.guests set attending = 'yes', first_name = 'Anca';
update public.guests set attending = 'yes';
delete from public.guests;

select is((select count(*)::int from public.activity_log where entity = 'guests' and action = 'insert'), 1, 'insert is logged');
select is((select count(*)::int from public.activity_log where entity = 'guests' and action = 'update'), 1, 'update is logged, a no-op update is not');
select is((select count(*)::int from public.activity_log where entity = 'guests' and action = 'delete'), 1, 'delete is logged');
select is(
  (select summary from public.activity_log where entity = 'guests' and action = 'update'),
  '{"attending": {"old": "unknown", "new": "yes"}}'::jsonb,
  'update stores only the changed fields, without guest names');
select is(
  (select count(*)::int from public.activity_log where summary::text ~ 'Ana|Anca|Popescu' and entity = 'guests'),
  0, 'guest names never reach the log');
select is(
  (select actor_id from public.activity_log where entity = 'guests' and action = 'insert'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'actor is recorded');
select is(
  (select entity_id from public.activity_log where entity = 'households'),
  '00000000-0000-0000-0000-0000000000d1'::uuid, 'households are logged with the row id');

select is((select count(*)::int from public.activity_log), 4, 'member reads the log of their wedding');

select throws_ok(
  $$insert into public.activity_log (wedding_id, entity, entity_id, action) values ('00000000-0000-0000-0000-0000000000b1', 'tasks', gen_random_uuid(), 'insert')$$,
  '42501', null, 'a member cannot insert into the log');
select throws_ok($$update public.activity_log set entity = 'x'$$, '42501', null, 'a member cannot update the log');
select throws_ok($$delete from public.activity_log$$, '42501', null, 'a member cannot delete from the log');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.activity_log), 0, 'outsider sees nothing');

reset role;
update public.activity_log set created_at = now() - interval '181 days' where action = 'insert' and entity = 'guests';
update public.activity_log set created_at = now() - interval '179 days' where entity = 'households';
select private.purge_activity_log();
select is((select count(*)::int from public.activity_log where entity = 'guests' and action = 'insert'), 0, 'purge removes rows older than 180 days');
select is((select count(*)::int from public.activity_log), 3, 'purge keeps newer rows');

select * from finish();
rollback;
