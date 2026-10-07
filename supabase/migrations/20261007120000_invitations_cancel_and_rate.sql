-- Review fixes for NS-050.
-- 1. Cancelling an invitation no longer deletes the row. The send limit counts invitations created in
--    the last 24 hours whatever their later fate, so invite, cancel, repeat cannot burn the email quota.
-- 2. A cancelled invitation reads as expired and cannot be accepted or declined.

alter table public.invitations add column cancelled_at timestamptz;

drop index public.invitations_pending_idx;
create unique index invitations_pending_idx on public.invitations (wedding_id, email)
  where accepted_at is null and declined_at is null and cancelled_at is null;

grant select (cancelled_at) on public.invitations to authenticated;

-- Cancelling goes through cancel_invitation; clients can no longer delete rows.
drop policy invitations_delete_managers on public.invitations;
revoke delete on public.invitations from authenticated;

create function public.cancel_invitation(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invitations i set cancelled_at = now()
  where i.id = p_id
    and i.accepted_at is null and i.declined_at is null and i.cancelled_at is null
    and (
      private.member_role(i.wedding_id) in ('owner', 'partner')
      or (private.member_role(i.wedding_id) = 'planner' and i.role in ('helper', 'viewer'))
    );
  if not found then
    raise exception 'not allowed to cancel this invitation' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.cancel_invitation(uuid) from public, anon;
grant execute on function public.cancel_invitation(uuid) to authenticated;

create or replace function public.create_invitation(p_wedding_id uuid, p_email text, p_role public.member_role)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_actor public.member_role;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
  v_row public.invitations;
begin
  if v_uid is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  v_actor := private.member_role(p_wedding_id);
  if v_actor is null
     or not (
       (v_actor in ('owner', 'partner') and p_role in ('partner', 'planner', 'helper', 'viewer'))
       or (v_actor = 'planner' and p_role in ('helper', 'viewer'))
     ) then
    raise exception 'not allowed to invite this role' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.wedding_members m
    join auth.users u on u.id = m.user_id
    where m.wedding_id = p_wedding_id and lower(u.email) = v_email
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;

  -- An expired pending invitation is replaced (it is older than the 24 hour send window, so it
  -- does not count toward the limit below); a live one blocks a duplicate.
  delete from public.invitations
  where wedding_id = p_wedding_id and email = v_email
    and accepted_at is null and declined_at is null and cancelled_at is null and expires_at <= now();
  if exists (
    select 1 from public.invitations
    where wedding_id = p_wedding_id and email = v_email
      and accepted_at is null and declined_at is null and cancelled_at is null
  ) then
    raise exception 'invitation already pending' using errcode = '23505';
  end if;
  -- Emails sent in the last 24 hours, whatever happened to the invitation since.
  if (
    select count(*) from public.invitations
    where wedding_id = p_wedding_id and created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'invitation limit reached' using errcode = 'P0001';
  end if;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.invitations (wedding_id, email, role, token_hash, invited_by)
  values (p_wedding_id, v_email, p_role, private.invite_token_hash(v_token), v_uid)
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'token', v_token,
    'email', v_row.email,
    'role', v_row.role,
    'createdAt', v_row.created_at,
    'expiresAt', v_row.expires_at,
    'weddingName', (select w.name from public.weddings w where w.id = p_wedding_id),
    'inviterName', coalesce((select p.display_name from public.profiles p where p.id = v_uid), '')
  );
end;
$$;

create or replace function public.inspect_invitation(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_inv public.invitations;
  v_wedding public.weddings;
begin
  select * into v_inv from public.invitations where token_hash = private.invite_token_hash(p_token);
  if not found then
    return jsonb_build_object('status', 'expired', 'workspaceName', '', 'inviterName', '',
      'role', 'viewer', 'date', null, 'city', null, 'email', null);
  end if;
  select * into v_wedding from public.weddings where id = v_inv.wedding_id;
  return jsonb_build_object(
    'status', case
      when v_inv.accepted_at is not null or v_inv.declined_at is not null then 'used'
      when v_inv.cancelled_at is not null or v_inv.expires_at <= now() or v_wedding.deleted_at is not null then 'expired'
      else 'valid' end,
    'workspaceName', v_wedding.name,
    'inviterName', coalesce((select p.display_name from public.profiles p where p.id = v_inv.invited_by), ''),
    'role', v_inv.role,
    'date', v_wedding.wedding_date,
    'city', v_wedding.city,
    'email', v_inv.email
  );
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.invitations;
  v_email text;
begin
  if v_uid is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  select * into v_inv from public.invitations
  where token_hash = private.invite_token_hash(p_token)
  for update;
  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
  if v_inv.accepted_at is not null or v_inv.declined_at is not null then
    raise exception 'invitation already used' using errcode = 'P0001';
  end if;
  if v_inv.cancelled_at is not null or v_inv.expires_at <= now()
     or exists (select 1 from public.weddings w where w.id = v_inv.wedding_id and w.deleted_at is not null) then
    raise exception 'invitation expired' using errcode = 'P0001';
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  if v_email is distinct from lower(v_inv.email::text) then
    raise exception 'invitation is for another email' using errcode = '42501';
  end if;

  -- Someone already in the wedding keeps their current role.
  insert into public.wedding_members (wedding_id, user_id, role)
  values (v_inv.wedding_id, v_uid, v_inv.role)
  on conflict (wedding_id, user_id) do nothing;

  update public.invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  return v_inv.wedding_id;
end;
$$;

create or replace function public.decline_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invitations set declined_at = now()
  where token_hash = private.invite_token_hash(p_token)
    and accepted_at is null and declined_at is null and cancelled_at is null and expires_at > now();
  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
end;
$$;
