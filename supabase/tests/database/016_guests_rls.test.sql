begin;
select plan(14);

insert into public.allowed_emails (email) values
  ('a1@example.com'),
  ('a2@example.com'),
  ('a3@example.com'),
  ('a4@example.com'),
  ('a5@example.com');

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
insert into public.households (id, wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Popescu'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', 'Ionescu');
insert into public.guests (id, wedding_id, household_id, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Ana', 'Popescu');

create function public.test_rows_affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from public.households), 1, 'viewer can read households');
select is((select count(*)::int from public.guests), 1, 'viewer can read guests');
select throws_ok(
  $$insert into public.guests (wedding_id, household_id, first_name) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Nope')$$,
  '42501', null, 'viewer cannot insert a guest');
select is(public.test_rows_affected($q$update public.guests set attending = 'yes'$q$), 0, 'viewer cannot update a guest');
select is(public.test_rows_affected($q$delete from public.households$q$), 0, 'viewer cannot delete a household');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.guests (wedding_id, household_id, first_name, diet) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Ion', 'vegan')$$,
  'helper can insert a guest');
select is(public.test_rows_affected($q$update public.guests set attending = 'yes'$q$), 2, 'helper can update guests');
select throws_ok(
  $$insert into public.households (wedding_id, name) values ('00000000-0000-0000-0000-0000000000b2', 'Other')$$,
  '42501', null, 'helper cannot insert into a wedding they are not in');
select throws_ok(
  $$insert into public.guests (wedding_id, household_id, first_name) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d2', 'Cross')$$,
  '23503', null, 'a guest cannot point at a household of another wedding');
select throws_ok(
  $$insert into public.guests (wedding_id, household_id, diet) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'allergy')$$,
  '23514', null, 'invalid diet is rejected');
select throws_ok(
  $$insert into public.guests (wedding_id, household_id, attending) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'maybe')$$,
  '23514', null, 'invalid attending value is rejected');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.households) + (select count(*)::int from public.guests), 0, 'outsider sees no households or guests');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.test_rows_affected($q$delete from public.households$q$), 1, 'owner can delete a household');
select is((select count(*)::int from public.guests), 0, 'deleting a household removes its guests');

select * from finish();
rollback;
