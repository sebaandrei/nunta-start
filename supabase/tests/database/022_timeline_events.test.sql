begin;
select plan(23);

insert into public.allowed_emails (email) values
  ('a1@example.com'), ('a2@example.com'), ('a3@example.com'), ('a4@example.com'), ('a5@example.com');

-- a1 owner, a2 viewer, a3 outsider, a4 helper of W1; a5 owner of W2
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'a4@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'a5@example.com');
insert into public.weddings (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'W1'),
  ('00000000-0000-0000-0000-0000000000b2', 'W2');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a4', 'helper'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a5', 'owner');
insert into public.timeline_events (id, wedding_id, title, start_time, duration_minutes, position) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'Ceremonie', '16:00', 60, 1),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b1', 'Petrecere', '19:30', null, 2);

create function public.test_rows_affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

create temp table tokens (who text primary key, token text);
grant all on tokens to authenticated;

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from public.timeline_events), 2, 'viewer can read events');
select throws_ok(
  $$insert into public.timeline_events (wedding_id, title, start_time) values ('00000000-0000-0000-0000-0000000000b1', 'Nope', '10:00')$$,
  '42501', null, 'viewer cannot insert an event');
select is(public.test_rows_affected($q$update public.timeline_events set title = 'X'$q$), 0, 'viewer cannot update an event');
select is(public.test_rows_affected($q$delete from public.timeline_events$q$), 0, 'viewer cannot delete an event');
select throws_ok(
  $$select public.generate_timeline_share_token('00000000-0000-0000-0000-0000000000b1')$$,
  '42501', null, 'viewer cannot generate a share token');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.timeline_events (wedding_id, title, start_time, duration_minutes, location) values ('00000000-0000-0000-0000-0000000000b1', 'Tort', '22:00', 15, 'Salon')$$,
  'helper can insert an event');
select is(public.test_rows_affected($q$update public.timeline_events set notes = 'ok'$q$), 3, 'helper can update events');
select throws_ok(
  $$insert into public.timeline_events (wedding_id, title, start_time) values ('00000000-0000-0000-0000-0000000000b2', 'Cross', '10:00')$$,
  '42501', null, 'helper cannot insert into a wedding they are not in');
select throws_ok(
  $$insert into public.timeline_events (wedding_id, title, start_time, duration_minutes) values ('00000000-0000-0000-0000-0000000000b1', 'Bad', '10:00', 0)$$,
  '23514', null, 'a zero duration is rejected');
select throws_ok(
  $$update public.timeline_events set wedding_id = '00000000-0000-0000-0000-0000000000b2' where id = '00000000-0000-0000-0000-0000000000e1'$$,
  null, null, 'wedding_id cannot be changed');
select throws_ok($$select count(*) from public.timeline_share_tokens$$, '42501', null, 'members cannot read the token table');
insert into tokens select 'helper', public.generate_timeline_share_token('00000000-0000-0000-0000-0000000000b1');
select is((select length(token) from tokens where who = 'helper'), 40, 'helper gets a 40 character token');
select is(public.test_rows_affected($q$delete from public.timeline_events where title = 'Tort'$q$), 1, 'helper can delete an event');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into tokens select 'owner', public.generate_timeline_share_token('00000000-0000-0000-0000-0000000000b1');
select isnt((select token from tokens where who = 'owner'), (select token from tokens where who = 'helper'), 'owner rotates and gets a new token');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.timeline_events), 0, 'outsider sees no events');
select throws_ok(
  $$select public.generate_timeline_share_token('00000000-0000-0000-0000-0000000000b1')$$,
  '42501', null, 'outsider cannot generate a share token');

reset role;
select is((select count(*)::int from public.timeline_share_tokens), 1, 'one token row per wedding');
select is(
  (select token_hash from public.timeline_share_tokens),
  sha256(convert_to((select token from tokens where who = 'owner'), 'UTF8')),
  'only the sha256 of the current token is stored');

-- What the share Edge Function runs with the service role.
select is(
  (select count(*)::int from public.timeline_share_tokens t
   join public.timeline_events e on e.wedding_id = t.wedding_id
   where t.token_hash = private.rsvp_token_hash((select token from tokens where who = 'owner'))),
  2, 'the current token returns the wedding events');
select is(
  (select count(*)::int from public.timeline_share_tokens t
   join public.timeline_events e on e.wedding_id = t.wedding_id
   where t.token_hash = private.rsvp_token_hash((select token from tokens where who = 'helper'))),
  0, 'the rotated-out token returns nothing');
select is(
  (select count(*)::int from public.timeline_share_tokens
   where token_hash = private.rsvp_token_hash('not-a-token')),
  0, 'a wrong token returns nothing');
select is(
  (select count(*)::int from public.activity_log
   where entity = 'timeline_events' and action = 'insert' and actor_id = '00000000-0000-0000-0000-0000000000a4'),
  1, 'event insert by the helper wrote an audit row');
select is(
  (select count(*)::int from public.activity_log
   where entity = 'timeline_events' and action = 'delete' and actor_id = '00000000-0000-0000-0000-0000000000a4'),
  1, 'event delete wrote an audit row');

select * from finish();
rollback;
