-- budget_lines.paid: editors can set it, viewers and helpers cannot, negatives are rejected.
begin;
select plan(7);

insert into public.allowed_emails (email) values ('p1@example.com'), ('p2@example.com'), ('p3@example.com');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'p1@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'p2@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'p3@example.com');
insert into public.weddings (id, name) values ('00000000-0000-0000-0000-0000000000f1', 'W');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e3', 'helper');
insert into public.budget_lines (id, wedding_id, name, unit_price) values
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1', 'Hall', 1000);

create function public.test_rows_affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

select is((select paid from public.budget_lines), null, 'paid defaults to null');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(public.test_rows_affected($q$update public.budget_lines set paid = 250.5$q$), 1, 'owner can set paid');
select is((select paid from public.budget_lines), 250.50, 'paid is stored with two decimals');
select throws_ok($$update public.budget_lines set paid = -1$$, '23514', null, 'negative paid is rejected');
select lives_ok($$update public.budget_lines set paid = 0$$, 'zero paid is allowed');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(public.test_rows_affected($q$update public.budget_lines set paid = 5$q$), 0, 'viewer cannot set paid');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select is(public.test_rows_affected($q$update public.budget_lines set paid = 5$q$), 0, 'helper cannot set paid');

select * from finish();
rollback;
