begin;
select plan(20);

-- a1 owner, a2 viewer, a3 outsider, a4 planner, a5 partner (all of W1); a6 owner of W2
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
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a4', 'planner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a5', 'partner'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a6', 'owner');

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
select is((select count(*)::int from public.weddings), 1, 'member sees exactly their wedding');
select is((select count(*)::int from public.wedding_members), 4, 'member sees the roster of their wedding');
select is((select count(*)::int from public.profiles), 4, 'member sees co-member profiles');
select is(
  public.test_rows_affected($q$update public.weddings set name = 'X'$q$),
  0, 'viewer cannot update the wedding');
select is(
  public.test_rows_affected($q$delete from public.wedding_members where user_id = '00000000-0000-0000-0000-0000000000a4'$q$),
  0, 'viewer cannot remove members');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.weddings), 0, 'outsider sees no weddings');
select is((select count(*)::int from public.wedding_members), 0, 'outsider sees no members');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok(
  $$update public.weddings set deleted_at = now()$$,
  '42501', 'only the owner can delete or restore a wedding', 'planner cannot soft-delete the wedding');
select is(
  public.test_rows_affected($q$update public.weddings set name = 'Planned'$q$),
  1, 'planner can update the wedding');
select is(
  public.test_rows_affected($q$update public.wedding_members set role = 'helper' where user_id = '00000000-0000-0000-0000-0000000000a2'$q$),
  1, 'planner can change a viewer to helper');
select throws_ok(
  $$update public.wedding_members set role = 'owner' where user_id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', null, 'planner cannot promote to owner');
select throws_ok(
  $$update public.wedding_members set user_id = '00000000-0000-0000-0000-0000000000a3' where user_id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', null, 'user_id of a membership cannot be changed');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select throws_ok(
  $$update public.weddings set deleted_at = now()$$,
  '42501', 'only the owner can delete or restore a wedding', 'partner cannot soft-delete the wedding');
select is(public.test_rows_affected($q$update public.weddings set eur_rate = 4.9$q$), 1, 'partner can still update other wedding columns');
select is(
  public.test_rows_affected($q$delete from public.weddings$q$),
  0, 'partner cannot delete the wedding');
select is(
  public.test_rows_affected($q$delete from public.wedding_members where user_id = '00000000-0000-0000-0000-0000000000a1'$q$),
  0, 'partner cannot remove the owner');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.test_rows_affected($q$update public.weddings set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000b1'$q$), 1, 'owner can soft-delete the wedding');
select is(public.test_rows_affected($q$update public.weddings set deleted_at = null where id = '00000000-0000-0000-0000-0000000000b1'$q$), 1, 'owner can restore the wedding');
select is(
  public.test_rows_affected($q$delete from public.weddings where id = '00000000-0000-0000-0000-0000000000b1'$q$),
  1, 'owner can delete the wedding');
reset role;
select is((select count(*)::int from public.wedding_members where wedding_id = '00000000-0000-0000-0000-0000000000b1'), 0, 'members cascade with the wedding');

select * from finish();
rollback;
