begin;
select plan(9);

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
insert into public.tasks (id, wedding_id, title, category) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Book venue', 'locatie');

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
select is((select count(*)::int from public.tasks), 1, 'viewer can read tasks');
select throws_ok(
  $$insert into public.tasks (wedding_id, title, category) values ('00000000-0000-0000-0000-0000000000b1', 'Nope', 'altele')$$,
  '42501', null, 'viewer cannot insert a task');
select is(public.test_rows_affected($q$update public.tasks set status = 'done'$q$), 0, 'viewer cannot update a task');
select is(public.test_rows_affected($q$delete from public.tasks$q$), 0, 'viewer cannot delete a task');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.tasks (wedding_id, title, category) values ('00000000-0000-0000-0000-0000000000b1', 'Photographer', 'foto')$$,
  'helper can insert a task');
select is(public.test_rows_affected($q$update public.tasks set status = 'done'$q$), 2, 'helper can update tasks');
select throws_ok(
  $$insert into public.tasks (wedding_id, title, category) values ('00000000-0000-0000-0000-0000000000b2', 'Other', 'altele')$$,
  '42501', null, 'helper cannot insert into a wedding they are not in');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.tasks), 0, 'outsider sees no tasks');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.test_rows_affected($q$delete from public.tasks$q$), 2, 'owner can delete tasks');

select * from finish();
rollback;
