-- NS-303: custom pages. collections (a page) -> collection_fields (typed columns) -> collection_records (jsonb data).
-- Read: any member. Write: owner, partner, planner, helper (not viewer).
-- The slug is generated at creation and never changes, so links survive a rename.

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  slug text not null default '',
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  unique (id, wedding_id),
  unique (wedding_id, slug)
);

create table public.collection_fields (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  collection_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (length(btrim(label)) > 0),
  type text not null check (type in ('text', 'number', 'money', 'date', 'choice', 'checkbox', 'person', 'link')),
  required boolean not null default false,
  options jsonb not null default '[]',
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  check (jsonb_typeof(options) = 'array'),
  check (type <> 'choice' or jsonb_array_length(options) > 0),
  unique (collection_id, key),
  -- The collection must belong to the same wedding.
  foreign key (collection_id, wedding_id)
    references public.collections (id, wedding_id)
    on delete cascade
);

create table public.collection_records (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  collection_id uuid not null,
  data jsonb not null default '{}',
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  foreign key (collection_id, wedding_id)
    references public.collections (id, wedding_id)
    on delete cascade
);

create index collections_wedding_idx on public.collections (wedding_id);
create index collection_fields_wedding_idx on public.collection_fields (wedding_id);
create index collection_records_wedding_idx on public.collection_records (wedding_id);
create index collection_records_collection_idx on public.collection_records (collection_id);

-- Slug: lower-case ASCII from the name, "-2", "-3", ... on collision within the wedding.
create function private.set_collection_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base text := btrim(
    regexp_replace(translate(lower(new.name), 'ăâîșşțţ', 'aaisstt'), '[^a-z0-9]+', '-', 'g'),
    '-');
  candidate text;
  n int := 1;
begin
  if base = '' then
    base := 'pagina';
  end if;
  candidate := base;
  while exists (
    select 1 from public.collections c
    where c.wedding_id = new.wedding_id and c.slug = candidate
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

-- Validates a record against the fields of its collection.
create function private.validate_collection_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f record;
  v jsonb;
  k text;
begin
  if jsonb_typeof(new.data) is distinct from 'object' then
    raise exception 'record data must be a JSON object' using errcode = 'check_violation';
  end if;

  for k in select jsonb_object_keys(new.data) loop
    if not exists (
      select 1 from public.collection_fields cf
      where cf.collection_id = new.collection_id and cf.key = k
    ) then
      raise exception 'unknown field "%"', k using errcode = 'check_violation';
    end if;
  end loop;

  for f in
    select key, type, required, options
    from public.collection_fields
    where collection_id = new.collection_id
  loop
    v := new.data -> f.key;
    if v is null or v = 'null'::jsonb or v = '""'::jsonb then
      if f.required then
        raise exception 'field "%" is required', f.key using errcode = 'check_violation';
      end if;
      continue;
    end if;

    if f.type in ('text', 'person') and jsonb_typeof(v) <> 'string' then
      raise exception 'field "%" must be text', f.key using errcode = 'check_violation';
    elsif f.type in ('number', 'money') and jsonb_typeof(v) <> 'number' then
      raise exception 'field "%" must be a number', f.key using errcode = 'check_violation';
    elsif f.type = 'checkbox' and jsonb_typeof(v) <> 'boolean' then
      raise exception 'field "%" must be true or false', f.key using errcode = 'check_violation';
    elsif f.type = 'link' and (jsonb_typeof(v) <> 'string' or (v #>> '{}') !~* '^https?://\S+$') then
      raise exception 'field "%" must be an http(s) link', f.key using errcode = 'check_violation';
    elsif f.type = 'choice' and not (f.options @> jsonb_build_array(v)) then
      raise exception 'field "%" must be one of the options', f.key using errcode = 'check_violation';
    elsif f.type = 'date' then
      begin
        if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then
          raise invalid_datetime_format;
        end if;
        perform (v #>> '{}')::date;
      exception when others then
        raise exception 'field "%" must be a date (YYYY-MM-DD)', f.key using errcode = 'check_violation';
      end;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.validate_collection_record() from public;

create trigger collections_set_slug
  before insert on public.collections
  for each row execute function private.set_collection_slug();
create trigger collection_records_validate
  before insert or update on public.collection_records
  for each row execute function private.validate_collection_record();

create trigger collections_set_audit
  before update on public.collections
  for each row execute function private.set_audit_columns();
create trigger collection_fields_set_audit
  before update on public.collection_fields
  for each row execute function private.set_audit_columns();
create trigger collection_records_set_audit
  before update on public.collection_records
  for each row execute function private.set_audit_columns();

create trigger collections_immutable_wedding
  before update on public.collections
  for each row execute function private.forbid_column_change('wedding_id', 'slug');
create trigger collection_fields_immutable_wedding
  before update on public.collection_fields
  for each row execute function private.forbid_column_change('wedding_id');
create trigger collection_records_immutable_wedding
  before update on public.collection_records
  for each row execute function private.forbid_column_change('wedding_id');

create trigger collections_broadcast
  after insert or update or delete on public.collections
  for each row execute function private.broadcast_wedding_change();
create trigger collection_fields_broadcast
  after insert or update or delete on public.collection_fields
  for each row execute function private.broadcast_wedding_change();
create trigger collection_records_broadcast
  after insert or update or delete on public.collection_records
  for each row execute function private.broadcast_wedding_change();

alter table public.collections enable row level security;
alter table public.collection_fields enable row level security;
alter table public.collection_records enable row level security;

create policy collections_select_member on public.collections
  for select to authenticated
  using (private.member_role(wedding_id) is not null);
create policy collections_insert_editors on public.collections
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy collections_update_editors on public.collections
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy collections_delete_editors on public.collections
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));

create policy collection_fields_select_member on public.collection_fields
  for select to authenticated
  using (private.member_role(wedding_id) is not null);
create policy collection_fields_insert_editors on public.collection_fields
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy collection_fields_update_editors on public.collection_fields
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy collection_fields_delete_editors on public.collection_fields
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));

create policy collection_records_select_member on public.collection_records
  for select to authenticated
  using (private.member_role(wedding_id) is not null);
create policy collection_records_insert_editors on public.collection_records
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy collection_records_update_editors on public.collection_records
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy collection_records_delete_editors on public.collection_records
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
