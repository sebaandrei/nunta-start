begin;
select plan(11);

insert into public.allowed_emails (email) values ('a1@example.com'), ('a3@example.com');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com');
insert into public.weddings (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'W1'),
  ('00000000-0000-0000-0000-0000000000b2', 'W2');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner');

delete from realtime.messages;
insert into public.tasks (id, wedding_id, title, category) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Book venue', 'locatie');
update public.tasks set status = 'done';
delete from public.tasks;

select is(
  (select count(*)::int from realtime.messages where topic = 'wedding:00000000-0000-0000-0000-0000000000b1'),
  3, 'insert, update and delete each broadcast on the wedding channel');
select is(
  (select payload ->> 'table' from realtime.messages order by inserted_at, id limit 1),
  'tasks', 'payload names the table');

delete from realtime.messages;
insert into public.budget_scenarios (wedding_id, guests) values ('00000000-0000-0000-0000-0000000000b2', 100);
select is(
  (select count(*)::int from realtime.messages where topic = 'wedding:00000000-0000-0000-0000-0000000000b2'),
  1, 'budget changes broadcast to their own wedding channel');

delete from realtime.messages;
insert into public.households (id, wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Popescu');
insert into public.guests (wedding_id, household_id, first_name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Ana');
select is(
  (select count(*)::int from realtime.messages where topic = 'wedding:00000000-0000-0000-0000-0000000000b1'),
  2, 'household and guest changes broadcast on the wedding channel');

delete from realtime.messages;
insert into public.collections (id, wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 'Furnizori');
insert into public.collection_fields (wedding_id, collection_id, key, label, type) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'nume', 'Nume', 'text');
insert into public.collection_records (wedding_id, collection_id, data) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"nume":"Foto Ana"}');
select is(
  (select count(*)::int from realtime.messages where topic = 'wedding:00000000-0000-0000-0000-0000000000b1'),
  3, 'collection, field and record changes broadcast on the wedding channel');

delete from realtime.messages;
insert into public.timeline_events (wedding_id, title, start_time) values
  ('00000000-0000-0000-0000-0000000000b1', 'Ceremonie', '16:00');
select is(
  (select count(*)::int from realtime.messages where topic = 'wedding:00000000-0000-0000-0000-0000000000b1' and payload ->> 'table' = 'timeline_events'),
  1, 'timeline event changes broadcast on the wedding channel');

delete from realtime.messages;
insert into public.tasks (wedding_id, title, category) values
  ('00000000-0000-0000-0000-0000000000b1', 'Photographer', 'foto');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('realtime.topic', 'wedding:00000000-0000-0000-0000-0000000000b1', true);
select is((select count(*)::int from realtime.messages), 1, 'member reads only their own wedding messages');
select set_config('realtime.topic', 'wedding:00000000-0000-0000-0000-0000000000b2', true);
select is((select count(*)::int from realtime.messages), 0, 'member cannot read another wedding channel');
select set_config('realtime.topic', 'wedding:00000000-0000-0000-0000-0000000000b1', true);
select is((select count(*)::int from realtime.messages where topic = 'wedding:00000000-0000-0000-0000-0000000000b2'), 0, 'member cannot select another wedding messages directly');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from realtime.messages), 0, 'outsider cannot read any wedding channel');
select set_config('realtime.topic', 'garbage', true);
select is((select count(*)::int from realtime.messages), 0, 'malformed topic is denied without an error');

select * from finish();
rollback;
