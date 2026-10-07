begin;
select plan(22);

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

insert into public.collections (id, wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 'Furnizori'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', 'Furnizori'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000b2', 'Furnizori'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000b1', 'Lună de miere!');

insert into public.collection_fields (wedding_id, collection_id, key, label, type, required, options) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'nume', 'Nume', 'text', true, '[]'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'pret', 'Preț', 'money', false, '[]'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'tip', 'Tip', 'choice', false, '["foto", "video"]'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'contract', 'Contract', 'date', false, '[]'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'site', 'Site', 'link', false, '[]'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'confirmat', 'Confirmat', 'checkbox', false, '[]'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'contact', 'Contact', 'person', false, '[]');

create function public.test_rows_affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Slugs.
select is((select slug from public.collections where id = '00000000-0000-0000-0000-0000000000f1'), 'furnizori', 'slug is generated from the name');
select is((select slug from public.collections where id = '00000000-0000-0000-0000-0000000000f2'), 'furnizori-2', 'a numeric suffix is added on collision');
select is((select slug from public.collections where id = '00000000-0000-0000-0000-0000000000f3'), 'furnizori', 'the same slug is allowed in another wedding');
select is((select slug from public.collections where id = '00000000-0000-0000-0000-0000000000f4'), 'luna-de-miere', 'diacritics and punctuation are normalised');
update public.collections set name = 'Altceva' where id = '00000000-0000-0000-0000-0000000000f1';
select is((select slug from public.collections where id = '00000000-0000-0000-0000-0000000000f1'), 'furnizori', 'renaming does not change the slug');
select throws_ok(
  $$update public.collections set slug = 'nou' where id = '00000000-0000-0000-0000-0000000000f1'$$,
  '23514', null, 'the slug cannot be changed');

-- Record validation.
select lives_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"nume":"Foto Ana","pret":1500.5,"tip":"foto","contract":"2027-05-01","site":"https://example.com","confirmat":true,"contact":"Ana"}')$$,
  'a valid record is accepted');
select throws_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"pret":10}')$$,
  '23514', 'field "nume" is required', 'a missing required field is rejected');
select throws_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"nume":""}')$$,
  '23514', 'field "nume" is required', 'an empty required field is rejected');
select throws_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"nume":"X","pret":"mult"}')$$,
  '23514', 'field "pret" must be a number', 'a wrong type is rejected');
select throws_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"nume":"X","tip":"dj"}')$$,
  '23514', 'field "tip" must be one of the options', 'a choice outside the options is rejected');
select throws_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"nume":"X","contract":"2027-02-30"}')$$,
  '23514', 'field "contract" must be a date (YYYY-MM-DD)', 'an invalid date is rejected');
select throws_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"nume":"X","extra":1}')$$,
  '23514', 'unknown field "extra"', 'an unknown field is rejected');

-- Cross-wedding references.
select throws_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f1', '{"nume":"X"}')$$,
  '23503', null, 'a record cannot point at a collection of another wedding');
select throws_ok(
  $$insert into public.collection_fields (wedding_id, collection_id, key, label, type) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f1', 'x', 'X', 'text')$$,
  '23503', null, 'a field cannot point at a collection of another wedding');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from public.collections) + (select count(*)::int from public.collection_fields) + (select count(*)::int from public.collection_records), 3 + 7 + 1, 'viewer can read collections, fields and records');
select throws_ok(
  $$insert into public.collections (wedding_id, name) values ('00000000-0000-0000-0000-0000000000b1', 'Nope')$$,
  '42501', null, 'viewer cannot insert a collection');
select is(public.test_rows_affected($q$update public.collections set name = 'Nope'$q$), 0, 'viewer cannot update a collection');
select throws_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"nume":"Nope"}')$$,
  '42501', null, 'viewer cannot insert a record');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.collection_records (wedding_id, collection_id, data) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', '{"nume":"Cofetarie"}')$$,
  'helper can insert a record');
select throws_ok(
  $$insert into public.collections (wedding_id, name) values ('00000000-0000-0000-0000-0000000000b2', 'Other')$$,
  '42501', null, 'helper cannot insert into a wedding they are not in');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.collections) + (select count(*)::int from public.collection_fields) + (select count(*)::int from public.collection_records), 0, 'outsider sees nothing');

select * from finish();
rollback;
