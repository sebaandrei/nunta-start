begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.com', '{"full_name":"Ana Pop"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'bogdan@example.com', '{}');

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Ana Pop', 'profile created from full_name metadata');
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'bogdan', 'profile falls back to email local part');
select is(
  (select email_digest from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  true, 'digest is on by default');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'user sees only their own profile');
select lives_ok(
  $$update public.profiles set display_name = 'Ana P.' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  'user can update own profile');
update public.profiles set display_name = 'hacked' where id = '00000000-0000-0000-0000-0000000000a2';
reset role;
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'bogdan', 'user cannot update another profile');

select * from finish();
rollback;
