-- NS-027: create_wedding RPC.
-- Templates are a fixture with the same counts as the real files (61 tasks from
-- src/content/ro/tasks.json, 20 budget lines from budget.json), built with generate_series.
begin;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com');

create temp table fx (tasks jsonb, lines jsonb);
grant all on fx to authenticated, anon;
insert into fx values (
  (select jsonb_agg(jsonb_build_object('template_key', 'k' || i, 'title', 'Task ' || i,
     'category', 'altele', 'days_before', i * 5, 'details', 'd')) from generate_series(1, 61) i),
  (select jsonb_agg(jsonb_build_object('name', 'Line ' || i, 'currency', case when i % 2 = 0 then 'EUR' else 'RON' end,
     'per_guest', i <= 4)) from generate_series(1, 20) i)
);

create function pg_temp.valid_input() returns jsonb language sql as $$
  select '{"name":"Nunta A+B","partner1_name":"Ana","partner2_name":"Bogdan","wedding_date":"2027-06-12",
           "eur_rate":4.97,"display_currency":"EUR","guest_scenarios":[100,150,200]}'::jsonb
$$;
grant execute on function pg_temp.valid_input() to authenticated;

-- anon is rejected
set local role anon;
select throws_ok($$select public.create_wedding('{}'::jsonb, '[]'::jsonb, '[]'::jsonb)$$,
  '42501', null, 'anon cannot call create_wedding');

-- authenticated without a JWT subject is rejected
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok($$select public.create_wedding(pg_temp.valid_input(), '[]'::jsonb, '[]'::jsonb)$$,
  '28000', 'authentication required', 'missing auth.uid() is rejected');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
create temp table res (id uuid);
grant all on res to authenticated;
insert into res select public.create_wedding(pg_temp.valid_input(), (select tasks from fx), (select lines from fx));

select is((select role::text from public.wedding_members where wedding_id = (select id from res)),
  'owner', 'caller becomes owner');
select is((select count(*)::int from public.tasks where wedding_id = (select id from res)), 61, '61 tasks seeded');
select is((select count(*)::int from public.budget_lines where wedding_id = (select id from res)), 20, '20 budget lines seeded');
select is((select array_agg(guests order by position) from public.budget_scenarios where wedding_id = (select id from res)),
  array[100, 150, 200], 'scenarios seeded in order');
select is((select s.guests from public.budget_settings b join public.budget_scenarios s on s.id = b.selected_scenario_id),
  100, 'first scenario is selected');
select is((select display_currency::text || eur_rate::text from public.weddings where id = (select id from res)),
  'EUR4.9700', 'wedding fields stored');

-- defaults: no scenarios -> one scenario of 200 guests
select lives_ok($$select public.create_wedding('{"name":"W","partner1_name":"A","partner2_name":"B"}'::jsonb, '[]'::jsonb, '[]'::jsonb)$$,
  'minimal input works');
select is((select count(*)::int from public.budget_scenarios where guests = 200 and wedding_id <> (select id from res)), 1, 'default scenario is 200 guests');

-- invalid input rejected and atomic (nothing left behind)
reset role;
create temp table before_counts as select
  (select count(*) from public.weddings) w, (select count(*) from public.tasks) t,
  (select count(*) from public.budget_lines) l, (select count(*) from public.budget_scenarios) s,
  (select count(*) from public.wedding_members) m;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select public.create_wedding('{"name":"  ","partner1_name":"A","partner2_name":"B"}'::jsonb, '[]'::jsonb, '[]'::jsonb)$$,
  '22023', null, 'empty name rejected');
select throws_ok($$select public.create_wedding('{"name":"W","partner1_name":"A","partner2_name":"B","display_currency":"USD"}'::jsonb, '[]'::jsonb, '[]'::jsonb)$$,
  '22023', null, 'unknown currency rejected');
-- late failure: valid wedding + tasks, but a task violates the category check after inserts began
select throws_ok(
  $$select public.create_wedding(pg_temp.valid_input(), '[{"title":"x","category":"nope"}]'::jsonb, '[]'::jsonb)$$,
  '23514', null, 'bad task category fails mid-transaction');
select throws_ok(
  $$select public.create_wedding('{"name":"W","partner1_name":"A","partner2_name":"B","wedding_date":"not-a-date"}'::jsonb, '[]'::jsonb, '[]'::jsonb)$$,
  '22023', null, 'invalid date rejected');
reset role;
select is(
  (select row((select count(*) from public.weddings), (select count(*) from public.tasks),
     (select count(*) from public.budget_lines), (select count(*) from public.budget_scenarios),
     (select count(*) from public.wedding_members))::text),
  (select row(w, t, l, s, m)::text from before_counts), 'no partial rows after failures');

-- cap: 5 owned weddings, the 6th is rejected (a1 owns 2 already)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_wedding(pg_temp.valid_input(), '[]'::jsonb, '[]'::jsonb);
select public.create_wedding(pg_temp.valid_input(), '[]'::jsonb, '[]'::jsonb);
select public.create_wedding(pg_temp.valid_input(), '[]'::jsonb, '[]'::jsonb);
select throws_ok($$select public.create_wedding(pg_temp.valid_input(), '[]'::jsonb, '[]'::jsonb)$$,
  'P0001', 'wedding limit reached: at most 5 weddings per owner', 'sixth owned wedding rejected');

-- isolation
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from public.weddings), 0, 'second user cannot see the first user''s weddings');

select * from finish();
rollback;
