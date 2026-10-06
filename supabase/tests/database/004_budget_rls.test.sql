begin;
select plan(13);

-- invite-only allowlist (NS-301): allow the test users
insert into public.allowed_emails (email) values
  ('a1@example.com'),
  ('a2@example.com'),
  ('a3@example.com'),
  ('a4@example.com'),
  ('a5@example.com'),
  ('a6@example.com');


-- a1 owner, a2 viewer, a3 outsider, a4 helper, a5 planner of W1; a6 owner of W2
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'a4@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'a5@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'a6@example.com');
insert into public.weddings (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'W1'),
  ('00000000-0000-0000-0000-0000000000b2', 'W2');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a4', 'helper'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a5', 'planner'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a6', 'owner');
insert into public.budget_scenarios (id, wedding_id, guests) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 100),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 150),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b1', 200),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000b1', 250),
  ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000b2', 80);
insert into public.budget_settings (wedding_id) values ('00000000-0000-0000-0000-0000000000b1');
insert into public.budget_lines (id, wedding_id, name, unit_price) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'Menu', 120);

create function public.test_rows_affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Trigger limits (run as table owner, bypassing RLS)
select throws_ok(
  $$insert into public.budget_scenarios (wedding_id, guests) values ('00000000-0000-0000-0000-0000000000b1', 300)$$,
  '23514', 'a wedding can have at most 4 budget scenarios', '5th scenario is rejected');
select throws_ok(
  $$delete from public.budget_scenarios where id = '00000000-0000-0000-0000-0000000000d9'$$,
  '23514', 'a wedding must keep at least 1 budget scenario', 'last scenario cannot be deleted');
select throws_ok(
  $$update public.budget_settings set selected_scenario_id = '00000000-0000-0000-0000-0000000000d9' where wedding_id = '00000000-0000-0000-0000-0000000000b1'$$,
  '23503', null, 'selected scenario must belong to the same wedding');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from public.budget_lines), 1, 'viewer can read budget lines');
select throws_ok(
  $$insert into public.budget_lines (wedding_id, name) values ('00000000-0000-0000-0000-0000000000b1', 'Nope')$$,
  '42501', null, 'viewer cannot insert a budget line');
select is(public.test_rows_affected($q$update public.budget_settings set family_gift = 1$q$), 0, 'viewer cannot update settings');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select is((select count(*)::int from public.budget_scenarios), 4, 'helper can read scenarios');
select is(public.test_rows_affected($q$update public.budget_lines set unit_price = 1$q$), 0, 'helper cannot edit the budget');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.budget_lines) + (select count(*)::int from public.budget_scenarios), 0, 'outsider sees no budget data');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.budget_lines (wedding_id, name, unit_price) values ('00000000-0000-0000-0000-0000000000b1', 'Cake', 50)$$,
  'planner can insert a budget line');
select is(public.test_rows_affected($q$update public.budget_settings set selected_scenario_id = '00000000-0000-0000-0000-0000000000d2'$q$), 1, 'planner can select a scenario');
select is(public.test_rows_affected($q$delete from public.budget_scenarios where id = '00000000-0000-0000-0000-0000000000d4'$q$), 1, 'planner can delete a scenario');

reset role;
-- Deleting a wedding cascades even through the min-1 scenario rule.
select lives_ok(
  $$delete from public.weddings where id = '00000000-0000-0000-0000-0000000000b2'$$,
  'deleting a wedding cascades its scenarios');

select * from finish();
rollback;
