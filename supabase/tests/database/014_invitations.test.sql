begin;
select plan(30);

insert into public.allowed_emails (email) values
  ('a1@example.com'), ('a2@example.com'), ('a3@example.com'), ('a4@example.com'), ('a5@example.com');

-- W1: a1 owner, a2 viewer, a4 planner. a3 invitee (no membership). a5 outsider.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'a4@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'a5@example.com');
update public.profiles set display_name = 'Ana' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.weddings (id, name, city) values
  ('00000000-0000-0000-0000-0000000000b1', 'Ana & Mihai', 'Brașov');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a4', 'planner');

create function public.test_rows_affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

create temp table t (name text primary key, val jsonb);
grant all on t to anon, authenticated;

set local role authenticated;

-- Creating
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into t select 'inv', public.create_invitation('00000000-0000-0000-0000-0000000000b1', '  A3@Example.com ', 'helper');
select matches((select val ->> 'token' from t where name = 'inv'), '^[0-9a-f]{32}$', 'owner gets a 128-bit hex token');
select is((select val ->> 'email' from t where name = 'inv'), 'a3@example.com', 'email is trimmed and lowercased');
select is((select val ->> 'inviterName' from t where name = 'inv'), 'Ana', 'the inviter name comes back for the email');
select throws_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'a3@example.com', 'viewer')$$,
  '23505', 'invitation already pending', 'a live invitation blocks a duplicate');
select throws_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'A2@example.com', 'viewer')$$,
  '23505', 'already a member', 'an existing member cannot be invited');
select throws_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'x@example.com', 'owner')$$,
  '42501', null, 'nobody is invited as owner');
select throws_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'not-an-email', 'viewer')$$,
  '22023', 'invalid email', 'a malformed email is rejected');
select is((select count(*)::int from public.invitations), 1, 'owner sees the pending invitation');
select throws_ok($$select token_hash from public.invitations$$, '42501', null, 'the token hash is not readable');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'y@example.com', 'viewer')$$,
  '42501', null, 'viewer cannot invite');
select is((select count(*)::int from public.invitations), 0, 'viewer sees no invitations');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'y@example.com', 'partner')$$,
  '42501', null, 'planner cannot invite a partner');
insert into t select 'z', public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'z@example.com', 'viewer');
select is((select val ->> 'role' from t where name = 'z'), 'viewer', 'planner can invite a viewer');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select throws_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'y@example.com', 'viewer')$$,
  '42501', null, 'outsider cannot invite');
select is((select count(*)::int from public.list_wedding_members('00000000-0000-0000-0000-0000000000b1')), 0, 'outsider gets no roster');

-- Inspecting, signed out
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.inspect_invitation((select val ->> 'token' from t where name = 'inv')) ->> 'status', 'valid', 'a visitor sees a valid invitation');
select is(public.inspect_invitation('nope') ->> 'status', 'expired', 'an unknown token reads as expired');

-- Accepting
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select throws_ok(
  format($$select public.accept_invitation(%L)$$, (select val ->> 'token' from t where name = 'inv')),
  '42501', 'invitation is for another email', 'another account cannot take the invitation');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is(
  public.accept_invitation((select val ->> 'token' from t where name = 'inv')),
  '00000000-0000-0000-0000-0000000000b1'::uuid, 'the invitee joins the wedding');
select is(
  (select role::text from public.wedding_members where user_id = '00000000-0000-0000-0000-0000000000a3'),
  'helper', 'with the invited role');
select throws_ok(
  format($$select public.accept_invitation(%L)$$, (select val ->> 'token' from t where name = 'inv')),
  'P0001', 'invitation already used', 'a token works once');

reset role;
-- Expired invitations are refused and can be replaced.
update public.invitations set expires_at = now() - interval '1 day' where email = 'z@example.com';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.inspect_invitation((select val ->> 'token' from t where name = 'z')) ->> 'status', 'expired', 'an old invitation reads as expired');
select is(public.inspect_invitation((select val ->> 'token' from t where name = 'inv')) ->> 'status', 'used', 'an accepted invitation reads as used');
select is((select count(*)::int from public.list_wedding_members('00000000-0000-0000-0000-0000000000b1')), 4, 'a member sees the whole roster');
select is((select email from public.list_wedding_members('00000000-0000-0000-0000-0000000000b1') where is_self), 'a1@example.com', 'the roster marks the caller');
select lives_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'z@example.com', 'viewer')$$,
  'an expired invitation is replaced by a new one');

-- Declining
insert into t select 'q', public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'q@example.com', 'viewer');
set local role anon;
select set_config('request.jwt.claims', '', true);
select lives_ok(format($$select public.decline_invitation(%L)$$, (select val ->> 'token' from t where name = 'q')), 'a visitor can decline');
select is(public.inspect_invitation((select val ->> 'token' from t where name = 'q')) ->> 'status', 'used', 'a declined invitation reads as used');
select throws_ok(format($$select public.decline_invitation(%L)$$, (select val ->> 'token' from t where name = 'q')), 'P0002', null, 'declining twice fails');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- Cancelling
select is(public.test_rows_affected($q$delete from public.invitations where email = 'z@example.com'$q$), 1, 'owner cancels a pending invitation');

select * from finish();
rollback;
