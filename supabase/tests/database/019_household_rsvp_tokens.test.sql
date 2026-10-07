begin;
select plan(9);

insert into public.allowed_emails (email) values ('a1@example.com'), ('a2@example.com'), ('a3@example.com'), ('a4@example.com');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'a4@example.com');
insert into public.weddings (id, name) values ('00000000-0000-0000-0000-0000000000b1', 'W1');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a4', 'helper');
insert into public.households (id, wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Popescu');

create temp table tokens (who text primary key, token text);
grant all on tokens to authenticated;

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$select public.generate_household_rsvp_token('00000000-0000-0000-0000-0000000000d1')$$,
  '42501', null, 'viewer cannot generate a token');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok(
  $$select public.generate_household_rsvp_token('00000000-0000-0000-0000-0000000000d1')$$,
  '42501', null, 'outsider cannot generate a token');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok(
  $$select public.generate_household_rsvp_token('00000000-0000-0000-0000-0000000000ff')$$,
  '42501', null, 'unknown household is refused');
select throws_ok($$select count(*) from public.household_rsvp_tokens$$, '42501', null, 'members cannot read the token table');

insert into tokens
  select 'owner', public.generate_household_rsvp_token('00000000-0000-0000-0000-0000000000d1');
select is((select length(token) from tokens where who = 'owner'), 40, 'owner gets a 40 character token');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
insert into tokens
  select 'helper', public.generate_household_rsvp_token('00000000-0000-0000-0000-0000000000d1');
select isnt(
  (select token from tokens where who = 'helper'), (select token from tokens where who = 'owner'),
  'helper can rotate and gets a new token');

reset role;
select is((select count(*)::int from public.household_rsvp_tokens), 1, 'one token row per household');
select is(
  (select token_hash from public.household_rsvp_tokens),
  sha256(convert_to((select token from tokens where who = 'helper'), 'UTF8')),
  'only the sha256 of the current token is stored');
select is(
  (select count(*)::int from public.household_rsvp_tokens
   where token_hash = sha256(convert_to((select token from tokens where who = 'owner'), 'UTF8'))),
  0, 'the rotated-out token no longer matches');

select * from finish();
rollback;
