begin;
select plan(1);

-- NS-063: every table in `public` must have RLS enabled. A new table without it
-- is reachable by any signed-in client through the REST API, so CI fails here.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
    order by c.relname
  $$,
  'every table in public has row level security enabled'
);

select * from finish();
rollback;
