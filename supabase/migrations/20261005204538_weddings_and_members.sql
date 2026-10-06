-- NS-025: weddings, wedding_members, role enum and RLS helper functions.
-- RLS is enabled here; the policies come in the next migration (deny-all until then).

create type public.currency as enum ('EUR', 'RON');
create type public.member_role as enum ('owner', 'partner', 'planner', 'helper', 'viewer');

-- Shared trigger for tables with updated_at + updated_by.
create function private.set_audit_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end;
$$;

-- Generic guard: raises if any of the named columns (trigger arguments) changes.
-- RLS WITH CHECK cannot compare old and new rows, so tenant keys are frozen with this.
create function private.forbid_column_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text;
begin
  foreach col in array tg_argv loop
    if to_jsonb(new) -> col is distinct from to_jsonb(old) -> col then
      raise exception 'column % of % is immutable', col, tg_table_name
        using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end;
$$;

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  wedding_date date,
  partner1_name text not null default '',
  partner2_name text not null default '',
  eur_rate numeric(10, 4) not null default 5 check (eur_rate > 0),
  display_currency public.currency not null default 'RON',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create trigger weddings_set_audit
  before update on public.weddings
  for each row execute function private.set_audit_columns();

create table public.wedding_members (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  unique (wedding_id, user_id)
);

-- Lookup path used by every RLS policy: (user_id, wedding_id).
create index wedding_members_user_wedding_idx on public.wedding_members (user_id, wedding_id);

create trigger wedding_members_set_audit
  before update on public.wedding_members
  for each row execute function private.set_audit_columns();

create trigger wedding_members_immutable_keys
  before update on public.wedding_members
  for each row execute function private.forbid_column_change('wedding_id', 'user_id');

alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;

-- Role of the current user in a wedding, or null if not a member.
create function private.member_role(p_wedding_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.wedding_members m
  where m.wedding_id = p_wedding_id
    and m.user_id = (select auth.uid())
$$;

create function private.has_role(p_wedding_id uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.member_role(p_wedding_id) = any (p_roles), false)
$$;

revoke all on function private.member_role(uuid) from public;
revoke all on function private.has_role(uuid, public.member_role[]) from public;
grant execute on function private.member_role(uuid) to authenticated;
grant execute on function private.has_role(uuid, public.member_role[]) to authenticated;
