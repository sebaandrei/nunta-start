-- NS-301: invite-only sign-up trigger on auth.users.
begin;
select plan(8);

insert into public.allowed_emails (email, note) values ('Friend@Example.test', 'test');

select lives_ok($$insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'friend@example.test')$$,
  'allowed email can sign up (case-insensitive)');
select lives_ok($$insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a2', ' FRIEND@EXAMPLE.TEST ')$$,
  'case and surrounding spaces are ignored');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 1,
  'profile trigger still creates a profile for an allowed user');
select throws_ok($$insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a3', 'stranger@example.test')$$,
  'P0001', 'signup_not_allowed', 'email not on the list is rejected');
select throws_ok($$insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a4', '')$$,
  'P0001', 'signup_not_allowed', 'empty email is rejected');
select throws_ok($$insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a5', null)$$,
  'P0001', 'signup_not_allowed', 'null email (phone sign-up) is rejected');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'), 0,
  'a rejected sign-up creates no profile');

-- the list itself is invisible to API roles
set local role authenticated;
select throws_ok($$select * from public.allowed_emails$$, '42501', null, 'authenticated cannot read the allowlist');

select * from finish();
rollback;
