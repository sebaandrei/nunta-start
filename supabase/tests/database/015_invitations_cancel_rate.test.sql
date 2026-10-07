begin;
select plan(9);

insert into public.allowed_emails (email) values ('a1@example.com'), ('a2@example.com'), ('a3@example.com');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com');
insert into public.weddings (id, name) values ('00000000-0000-0000-0000-0000000000b1', 'W1');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer');

create temp table t (name text primary key, val jsonb);
grant all on t to anon, authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

insert into t select 'c', public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'c@example.com', 'viewer');

select throws_ok($$delete from public.invitations$$, '42501', null, 'clients cannot delete invitation rows');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  format($$select public.cancel_invitation(%L)$$, (select val ->> 'id' from t where name = 'c')),
  '42501', null, 'a viewer cannot cancel');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(format($$select public.cancel_invitation(%L)$$, (select val ->> 'id' from t where name = 'c')), 'the owner cancels');
select throws_ok(
  format($$select public.cancel_invitation(%L)$$, (select val ->> 'id' from t where name = 'c')),
  '42501', null, 'cancelling twice fails');
select is(public.inspect_invitation((select val ->> 'token' from t where name = 'c')) ->> 'status', 'expired', 'a cancelled invitation reads as expired');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok(
  format($$select public.accept_invitation(%L)$$, (select val ->> 'token' from t where name = 'c')),
  'P0001', 'invitation expired', 'a cancelled invitation cannot be accepted');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'c@example.com', 'viewer')$$,
  'a cancelled person can be invited again');

-- 19 more in the window (20 sent so far), each cancelled right away: cancelling does not free the quota.
do $$
declare i int; v jsonb;
begin
  for i in 1..18 loop
    v := public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'r' || i || '@example.com', 'viewer');
    perform public.cancel_invitation((v ->> 'id')::uuid);
  end loop;
end $$;
select throws_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'over@example.com', 'viewer')$$,
  'P0001', 'invitation limit reached', 'invite and cancel cannot exceed 20 in 24 hours');

reset role;
update public.invitations set created_at = now() - interval '25 hours';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-0000000000b1', 'over@example.com', 'viewer')$$,
  'the window slides: older sends stop counting');

select * from finish();
rollback;
