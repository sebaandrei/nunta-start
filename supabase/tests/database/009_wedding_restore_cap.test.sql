-- NS-027: restoring a soft-deleted wedding is subject to the owner cap.
begin;
select plan(5);

insert into public.allowed_emails (email) values ('a1@example.com'), ('a2@example.com');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com');

-- a1 owns 5 weddings (b0..b4); a2 is a planner of b0
insert into public.weddings (id, name)
  select ('00000000-0000-0000-0000-0000000000b' || i)::uuid, 'W' || i from generate_series(0, 4) i;
insert into public.wedding_members (wedding_id, user_id, role)
  select ('00000000-0000-0000-0000-0000000000b' || i)::uuid, '00000000-0000-0000-0000-0000000000a1', 'owner'
  from generate_series(0, 4) i;
insert into public.wedding_members (wedding_id, user_id, role)
  values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'planner');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

update public.weddings set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000b0';
select lives_ok($$select public.create_wedding('{"name":"R","partner1_name":"A","partner2_name":"B"}'::jsonb, '[]'::jsonb, '[]'::jsonb)$$,
  'replacement wedding can be created after a soft delete');
select throws_ok($$update public.weddings set deleted_at = null where id = '00000000-0000-0000-0000-0000000000b0'$$,
  'P0001', 'wedding limit reached: at most 5 weddings per owner', 'restore over the cap is rejected');

-- free a slot, then restoring works
update public.weddings set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000b1';
select lives_ok($$update public.weddings set deleted_at = null where id = '00000000-0000-0000-0000-0000000000b0'$$,
  'restore under the cap works');

-- a non-owner editor still cannot restore
update public.weddings set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000b2';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok($$update public.weddings set deleted_at = null where id = '00000000-0000-0000-0000-0000000000b2'$$,
  '42501', 'only the owner can delete or restore a wedding', 'planner cannot restore');
reset role;

-- trusted server context (null auth.uid()) is not capped: 6th active wedding restores fine
select set_config('request.jwt.claims', '', true);
update public.weddings set deleted_at = null where id = '00000000-0000-0000-0000-0000000000b1';
select lives_ok($$update public.weddings set deleted_at = null where id = '00000000-0000-0000-0000-0000000000b2'$$,
  'restore with null auth.uid() ignores the cap');

select * from finish();
rollback;
