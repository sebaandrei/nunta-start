begin;
select plan(14);

insert into public.allowed_emails (email) values ('a1@example.com'), ('a2@example.com'), ('a3@example.com');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com');
insert into public.weddings (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'Solo'),
  ('00000000-0000-0000-0000-0000000000b2', 'Shared'),
  ('00000000-0000-0000-0000-0000000000b3', 'Recent');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a3', 'owner'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', 'owner');
insert into public.households (wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'Popescu');
insert into public.invitations (wedding_id, email, role, token_hash) values
  ('00000000-0000-0000-0000-0000000000b2', 'A1@example.com', 'helper', '\x0102'::bytea);

-- Only the service role may run it.
set local role authenticated;
select throws_ok(
  $$select public.delete_account_data('00000000-0000-0000-0000-0000000000a1', 'a1@example.com')$$,
  '42501', null, 'a signed-in user cannot call delete_account_data');
set local role anon;
select throws_ok(
  $$select public.delete_account_data('00000000-0000-0000-0000-0000000000a1', 'a1@example.com')$$,
  '42501', null, 'anon cannot call delete_account_data');
reset role;

set local role service_role;
select is(
  public.delete_account_data('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  1, 'one wedding is soft-deleted: the one they solely owned');
reset role;

select isnt((select deleted_at from public.weddings where id = '00000000-0000-0000-0000-0000000000b1'), null,
  'the solo wedding is soft-deleted');
select is((select deleted_at from public.weddings where id = '00000000-0000-0000-0000-0000000000b2'), null,
  'a wedding with another owner is kept');
select is((select count(*)::int from public.wedding_members where user_id = '00000000-0000-0000-0000-0000000000a1'), 0,
  'their memberships are removed');
select is((select count(*)::int from public.wedding_members where wedding_id = '00000000-0000-0000-0000-0000000000b2'), 1,
  'the other owner is still a member');
select is((select count(*)::int from public.invitations where lower(email::text) = 'a1@example.com'), 0,
  'invitations addressed to them are removed, whatever the case');
select is((select count(*)::int from public.allowed_emails where lower(email::text) = 'a1@example.com'), 0,
  'they are off the invite-only list');
select is((select count(*)::int from public.allowed_emails), 2, 'other people stay on the list');

-- Hard purge after the retention window.
update public.weddings set deleted_at = now() - interval '31 days' where id = '00000000-0000-0000-0000-0000000000b1';
update public.weddings set deleted_at = now() - interval '1 day' where id = '00000000-0000-0000-0000-0000000000b3';
select is(private.purge_deleted_weddings(), 1, 'the 30-day purge removes only the wedding deleted 31 days ago');
select is((select count(*)::int from public.households where wedding_id = '00000000-0000-0000-0000-0000000000b1'), 0,
  'its data is gone with it');
select is(private.purge_deleted_weddings(interval '0 seconds'), 1, 'a shortened interval purges the recent one too');
select is((select count(*)::int from public.weddings), 1, 'the live shared wedding is untouched');

select * from finish();
rollback;
