-- NS-210: weddings.city and weddings.godparents.
begin;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'a5@example.com');
insert into public.weddings (id, name) values ('00000000-0000-0000-0000-0000000000b1', 'W1');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a5', 'planner');

create function public.test_rows_affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

select is((select godparents from public.weddings where id = '00000000-0000-0000-0000-0000000000b1'),
  '[]'::jsonb, 'godparents default to an empty array');
select is((select city from public.weddings where id = '00000000-0000-0000-0000-0000000000b1'), null, 'city is nullable');

select lives_ok($$update public.weddings set godparents = '[{"godmother":"Maria","godfather":"Ion"},{"godmother":"","godfather":"Vasile"}]'::jsonb$$,
  '2 pairs (empty names allowed) accepted');
select lives_ok($$update public.weddings set godparents = (select jsonb_agg(jsonb_build_object('godmother','m','godfather','f')) from generate_series(1,5))$$,
  '5 pairs accepted');
select throws_ok($$update public.weddings set godparents = (select jsonb_agg(jsonb_build_object('godmother','m','godfather','f')) from generate_series(1,6))$$,
  '23514', null, '6 pairs rejected');
select throws_ok($$update public.weddings set godparents = '{"godmother":"a","godfather":"b"}'::jsonb$$,
  '23514', null, 'object instead of array rejected');
select throws_ok($$update public.weddings set godparents = '[{"godmother":"a"}]'::jsonb$$,
  '23514', null, 'missing godfather rejected');
select throws_ok($$update public.weddings set godparents = '[{"godmother":1,"godfather":"b"}]'::jsonb$$,
  '23514', null, 'non-string name rejected');
select throws_ok($$update public.weddings set godparents = jsonb_build_array(jsonb_build_object('godmother', repeat('x', 121), 'godfather', 'b'))$$,
  '23514', null, 'name over 120 chars rejected');
select throws_ok($$update public.weddings set city = repeat('x', 121)$$, '23514', null, 'city over 120 chars rejected');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select is(public.test_rows_affected($q$update public.weddings set city = 'Cluj-Napoca'$q$), 1, 'planner can update city');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(public.test_rows_affected($q$update public.weddings set city = 'Hacked'$q$), 0, 'viewer cannot update city');

-- create_wedding accepts both
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
create temp table res (id uuid);
grant all on res to authenticated;
insert into res select public.create_wedding(
  '{"name":"W","partner1_name":"A","partner2_name":"B","city":" Iași ","godparents":[{"godmother":"M","godfather":"F"}]}'::jsonb,
  '[]'::jsonb, '[]'::jsonb);
select is((select city || (godparents -> 0 ->> 'godfather') from public.weddings where id = (select id from res)),
  'IașiF', 'create_wedding stores city and godparents');

select * from finish();
rollback;
