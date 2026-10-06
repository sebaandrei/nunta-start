begin;
select plan(11);

-- invite-only allowlist (NS-301): allow the test users
insert into public.allowed_emails (email) values
  ('a1@example.com');


-- a1 is owner of both weddings, so RLS alone would allow moving rows between them.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com');
insert into public.weddings (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'W1'),
  ('00000000-0000-0000-0000-0000000000b2', 'W2');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'owner');
insert into public.tasks (wedding_id, title, category) values
  ('00000000-0000-0000-0000-0000000000b1', 'T', 'altele');
insert into public.budget_scenarios (wedding_id, guests) values
  ('00000000-0000-0000-0000-0000000000b1', 100),
  ('00000000-0000-0000-0000-0000000000b1', 150);
insert into public.budget_settings (wedding_id) values ('00000000-0000-0000-0000-0000000000b1');
insert into public.budget_lines (wedding_id, name) values ('00000000-0000-0000-0000-0000000000b1', 'L');

create function public.test_rows_affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select throws_ok($$update public.tasks set wedding_id = '00000000-0000-0000-0000-0000000000b2'$$,
  '23514', 'column wedding_id of tasks is immutable', 'task cannot move to another wedding');
select throws_ok($$update public.budget_scenarios set wedding_id = '00000000-0000-0000-0000-0000000000b2'$$,
  '23514', 'column wedding_id of budget_scenarios is immutable', 'scenario cannot move to another wedding');
select throws_ok($$update public.budget_lines set wedding_id = '00000000-0000-0000-0000-0000000000b2'$$,
  '23514', 'column wedding_id of budget_lines is immutable', 'budget line cannot move to another wedding');
select throws_ok($$update public.budget_settings set wedding_id = '00000000-0000-0000-0000-0000000000b2'$$,
  '23514', 'column wedding_id of budget_settings is immutable', 'budget settings cannot move to another wedding');
select throws_ok($$update public.wedding_members set wedding_id = '00000000-0000-0000-0000-0000000000b2'$$,
  '42501', null, 'membership cannot move to another wedding');

select is(public.test_rows_affected($q$update public.tasks set title = 'T2'$q$), 1, 'normal task update still works');
select is(public.test_rows_affected($q$update public.budget_scenarios set guests = guests + 1$q$), 2, 'normal scenario update still works');
select is(public.test_rows_affected($q$update public.budget_lines set name = 'L2'$q$), 1, 'normal budget line update still works');

reset role;
select is(
  (select count(*)::int from public.budget_scenarios where wedding_id = '00000000-0000-0000-0000-0000000000b1'),
  2, 'source wedding keeps its scenarios');
select ok(
  pg_get_functiondef('private.enforce_scenario_limits()'::regprocedure) ilike '%for update%',
  'scenario limit trigger locks the wedding row');
select ok(
  (select count(*) = 2 from regexp_matches(pg_get_functiondef('private.enforce_scenario_limits()'::regprocedure), 'for update', 'gi')),
  'both insert and delete paths take the lock');

select * from finish();
rollback;
