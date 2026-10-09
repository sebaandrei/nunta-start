-- NS-062: delete account.
--
-- The Edge Function `delete-account` (service role) calls delete_account_data() and then deletes the
-- auth user, which cascades to the profile and any remaining membership. The data step is one
-- transaction and idempotent, so a failed auth deletion can simply be retried.
--
-- A wedding the user solely owns is soft-deleted (not shared data anyone else can keep running) and
-- hard-purged after 30 days by purge_deleted_weddings(). A wedding with another owner stays.

create function public.delete_account_data(p_user_id uuid, p_email text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_weddings int;
begin
  if p_user_id is null then
    raise exception 'user id required' using errcode = '22023';
  end if;

  -- Weddings where this user is the only owner. Done before the memberships go.
  update public.weddings w
  set deleted_at = now()
  where w.deleted_at is null
    and exists (
      select 1 from public.wedding_members m
      where m.wedding_id = w.id and m.user_id = p_user_id and m.role = 'owner'
    )
    and not exists (
      select 1 from public.wedding_members o
      where o.wedding_id = w.id and o.role = 'owner' and o.user_id <> p_user_id
    );
  get diagnostics v_weddings = row_count;

  delete from public.wedding_members where user_id = p_user_id;

  if p_email is not null and p_email <> '' then
    -- Invitations addressed to them and their place on the invite-only list are personal data too.
    delete from public.invitations where lower(email::text) = lower(p_email);
    delete from public.allowed_emails where lower(email::text) = lower(p_email);
  end if;

  return v_weddings;
end;
$$;

-- Supabase grants execute on new public functions to anon and authenticated by default.
revoke all on function public.delete_account_data(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_account_data(uuid, text) to service_role;

-- Hard-deletes weddings soft-deleted longer ago than p_older_than; every child table cascades.
-- The parameter exists so the 30-day rule can be tested with a short interval.
create function private.purge_deleted_weddings(p_older_than interval default interval '30 days')
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from public.weddings
  where deleted_at is not null and deleted_at < now() - p_older_than;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.purge_deleted_weddings(interval) from public;

-- Daily purge with pg_cron, only where the extension is available so `db reset` never fails.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('purge-deleted-weddings', '41 3 * * *', 'select private.purge_deleted_weddings()');
  end if;
end;
$$;
