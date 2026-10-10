begin;
select plan(12);

insert into public.allowed_emails (email) values ('a1@example.com'), ('a2@example.com'), ('a3@example.com');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com');
insert into public.weddings (id, name, created_at, deleted_at) values
  ('00000000-0000-0000-0000-0000000000b1', 'Mine', '2026-01-01', null),
  ('00000000-0000-0000-0000-0000000000b2', 'Theirs', '2026-01-02', null),
  ('00000000-0000-0000-0000-0000000000b3', 'Deleted', '2026-01-03', now());
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'owner'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', 'owner');
insert into public.households (id, wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Popescu');
insert into public.guests (wedding_id, household_id, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Ion', 'Popescu');
insert into public.timeline_events (wedding_id, title, start_time) values
  ('00000000-0000-0000-0000-0000000000b1', 'Ceremonia', '16:00');
insert into public.invitations (wedding_id, email, role, token_hash) values
  ('00000000-0000-0000-0000-0000000000b1', 'friend@example.com', 'helper', '\x0102'::bytea);

set local role authenticated;

-- The owner gets their wedding, with every table.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(jsonb_array_length(public.export_my_data() -> 'weddings'), 2, 'owner exports exactly the weddings they own');
select is(public.export_my_data() -> 'weddings' -> 0 ->> 'name', 'Mine', 'it is their wedding');
select is(public.export_my_data() -> 'weddings' -> 1 ->> 'name', 'Deleted', 'a soft-deleted wedding they own is included');
select is(jsonb_array_length(public.export_my_data() -> 'weddings' -> 0 -> 'guests'), 1, 'guests are included');
select is(jsonb_array_length(public.export_my_data() -> 'weddings' -> 0 -> 'timeline_events'), 1, 'timeline events are included');
select is(jsonb_array_length(public.export_my_data() -> 'weddings' -> 0 -> 'members'), 2, 'members are included');
select is(jsonb_array_length(public.export_my_data() -> 'weddings' -> 0 -> 'invitations'), 1, 'invitations are included');
select ok(not (public.export_my_data() -> 'weddings' -> 0 -> 'invitations' -> 0) ? 'token_hash', 'invitation token hashes are not exported');
select is(public.export_my_data() ->> 'user_id', '00000000-0000-0000-0000-0000000000a1', 'the document names the user');

-- A user who owns one wedding and only views another exports just the one they own.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(public.export_my_data() -> 'weddings' -> 0 ->> 'name', 'Theirs', 'a viewer does not get the wedding they only view');

-- Someone with no wedding gets an empty list, not an error.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is(jsonb_array_length(public.export_my_data() -> 'weddings'), 0, 'a user without weddings gets an empty list');

-- Signed-out callers cannot run it at all.
set local role anon;
select throws_ok($$select public.export_my_data()$$, '42501', null, 'anon cannot call the export');

select * from finish();
rollback;
