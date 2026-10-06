-- NS-301: invite-only sign-up. Only emails listed in public.allowed_emails can create an
-- account; the app is for the owner's friends, not public.
-- RLS is enabled with NO policies: anon/authenticated can neither read nor write the list.
-- It is managed only with the service role or the SQL editor (see docs/runbooks/allowlist.md).

create extension if not exists citext with schema extensions;

create table public.allowed_emails (
  email extensions.citext primary key,
  note text,
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

-- Defense in depth on top of "no policies": no API role has any table privilege.
revoke all on public.allowed_emails from anon, authenticated;

-- Runs before the row is inserted, so a rejected sign-up creates no user and no profile.
-- Only inserts are checked: existing users keep working. Phone-only or email-less users
-- are rejected. Supabase surfaces the exception to clients as "Database error saving new user".
create function private.enforce_signup_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(coalesce(new.email, '')), '') is null
     or not exists (
       select 1 from public.allowed_emails a
       where lower(a.email::text) = lower(btrim(new.email))
     ) then
    raise exception 'signup_not_allowed';
  end if;
  return new;
end;
$$;

create trigger signup_allowlist
  before insert on auth.users
  for each row execute function private.enforce_signup_allowlist();
