-- create_wedding accepts negative days_before (steps after the wedding), still rejects non-integers.
begin;
select plan(5);

insert into public.allowed_emails (email) values ('n1@example.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'n1@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

create temp table res (id uuid);
grant all on res to authenticated;
insert into res select public.create_wedding(
  '{"name":"N","partner1_name":"A","partner2_name":"B"}'::jsonb,
  '[{"title":"before","category":"altele","days_before":410},
    {"title":"day","category":"altele","days_before":0},
    {"title":"after","category":"altele","days_before":-60},
    {"title":"after2","category":"altele","days_before":-1}]'::jsonb,
  '[]'::jsonb);

select is((select count(*)::int from public.tasks where wedding_id = (select id from res)), 4, 'four tasks seeded');
select is((select min(days_before) from public.tasks where wedding_id = (select id from res)), -60, 'negative days_before stored');
select is((select max(days_before) from public.tasks where wedding_id = (select id from res)), 410, 'positive days_before stored');

select throws_ok($$select public.create_wedding('{"name":"N","partner1_name":"A","partner2_name":"B"}'::jsonb,
  '[{"title":"x","category":"altele","days_before":-1.5}]'::jsonb, '[]'::jsonb)$$,
  '22023', 'invalid tasks_template item', 'a fractional days_before is still rejected');
select throws_ok($$select public.create_wedding('{"name":"N","partner1_name":"A","partner2_name":"B"}'::jsonb,
  '[{"title":"x","category":"altele","days_before":-123456}]'::jsonb, '[]'::jsonb)$$,
  '22023', 'invalid tasks_template item', 'an out-of-range days_before is still rejected');

select * from finish();
rollback;
