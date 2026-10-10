begin;
select plan(13);

insert into public.allowed_emails (email) values
  ('a1@example.com'),
  ('a2@example.com'),
  ('a3@example.com'),
  ('a4@example.com');

-- a1 owner, a2 viewer, a3 outsider, a4 helper of W1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'a4@example.com');
insert into public.weddings (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'W1');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a4', 'helper');
insert into public.collections (id, wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 'Furnizori');
insert into public.collection_fields (id, wedding_id, collection_id, key, label, type, required) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'nume', 'Nume', 'text', true),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'tel', 'Telefon', 'text', true),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'nota', 'Notă', 'text', false);
insert into public.collection_records (id, wedding_id, collection_id, data) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1',
   '{"nume": "Foto Studio", "tel": "0722", "nota": "avans"}');

set local role authenticated;

-- viewer and outsider cannot use the RPCs
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$select public.patch_collection_record('00000000-0000-0000-0000-0000000000a9', '{"nota": "x"}')$$,
  '42501', null, 'viewer cannot patch a record');
select throws_ok(
  $$select public.delete_collection_field('00000000-0000-0000-0000-0000000000e3')$$,
  '42501', null, 'viewer cannot delete a field');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok(
  $$select public.patch_collection_record('00000000-0000-0000-0000-0000000000a9', '{"nota": "x"}')$$,
  'P0002', null, 'outsider cannot see the record to patch it');
select throws_ok(
  $$select public.delete_collection_field('00000000-0000-0000-0000-0000000000e3')$$,
  'P0002', null, 'outsider cannot see the field to delete it');

-- helper: patches merge, so two edits of different keys both survive
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select lives_ok(
  $$select public.patch_collection_record('00000000-0000-0000-0000-0000000000a9', '{"nota": "achitat"}')$$,
  'helper can patch a record');
select lives_ok(
  $$select public.patch_collection_record('00000000-0000-0000-0000-0000000000a9', '{"tel": "0733"}')$$,
  'a second patch of another key');
select is(
  (select data from public.collection_records where id = '00000000-0000-0000-0000-0000000000a9'),
  '{"nume": "Foto Studio", "tel": "0733", "nota": "achitat"}'::jsonb,
  'both edits are kept');
select lives_ok(
  $$select public.patch_collection_record('00000000-0000-0000-0000-0000000000a9', '{"nota": null}')$$,
  'null clears an optional key');
select is(
  (select data ? 'nota' from public.collection_records where id = '00000000-0000-0000-0000-0000000000a9'),
  false, 'the cleared key is gone');
select throws_ok(
  $$select public.patch_collection_record('00000000-0000-0000-0000-0000000000a9', '{"tel": ""}')$$,
  '23514', null, 'the validator still rejects clearing a required field');

-- deleting a populated required field works and strips its key
select lives_ok(
  $$select public.delete_collection_field('00000000-0000-0000-0000-0000000000e2')$$,
  'helper can delete a populated required field');
select is(
  (select data from public.collection_records where id = '00000000-0000-0000-0000-0000000000a9'),
  '{"nume": "Foto Studio"}'::jsonb,
  'the deleted field key is stripped from the record');
select throws_ok(
  $$update public.collection_records set data = '{"nume": "x", "tel": "1"}'
    where id = '00000000-0000-0000-0000-0000000000a9'$$,
  '23514', null, 'validation is back on afterwards: the deleted field is an unknown key');

select * from finish();
rollback;
