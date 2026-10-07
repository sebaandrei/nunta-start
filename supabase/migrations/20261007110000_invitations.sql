-- NS-050 / NS-051: invitations. A member who may manage roles invites a person by email; the
-- invitee opens /invite/<token>, sees the wedding and accepts (becomes a member with the invited
-- role) or declines. The token is 128 bits of randomness, shown once to the Edge Function that
-- emails it, and stored only as a SHA-256 hash. Invitations expire after 14 days.
--
-- Sign-up stays invite-only (NS-301): accepting needs a signed-in account, and a person who is
-- not in allowed_emails still cannot create one.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  email extensions.citext not null check (char_length(email::text) <= 254),
  role public.member_role not null check (role <> 'owner'),
  token_hash bytea not null unique,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  declined_at timestamptz,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index invitations_wedding_idx on public.invitations (wedding_id);

-- One pending invitation per person and wedding.
create unique index invitations_pending_idx on public.invitations (wedding_id, email)
  where accepted_at is null and declined_at is null;

alter table public.invitations enable row level security;

-- Managers read and cancel pending invitations of their wedding; the rule mirrors members.
-- There are no insert or update policies: rows are written only by the functions below.
create policy invitations_select_managers on public.invitations
  for select to authenticated
  using (
    (private.member_role(wedding_id) in ('owner', 'partner') and role <> 'owner')
    or (private.member_role(wedding_id) = 'planner' and role in ('helper', 'viewer'))
  );

create policy invitations_delete_managers on public.invitations
  for delete to authenticated
  using (
    (private.member_role(wedding_id) in ('owner', 'partner') and role <> 'owner')
    or (private.member_role(wedding_id) = 'planner' and role in ('helper', 'viewer'))
  );

-- The hash is never readable through the API.
revoke all on public.invitations from anon, authenticated;
grant select (id, wedding_id, email, role, expires_at, accepted_at, declined_at, invited_by, created_at)
  on public.invitations to authenticated;
grant delete on public.invitations to authenticated;

create function private.invite_token_hash(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(coalesce(p_token, ''), 'UTF8'));
$$;

-- Creates an invitation and returns the plain token ONCE, for the Edge Function that emails it.
create function public.create_invitation(p_wedding_id uuid, p_email text, p_role public.member_role)
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

  -- An expired invitation is replaced; a live one blocks a duplicate.
  delete from public.invitations
  where wedding_id = p_wedding_id and email = v_email
    and accepted_at is null and declined_at is null and expires_at <= now();
  if exists (
    select 1 from public.invitations
    where wedding_id = p_wedding_id and email = v_email
      and accepted_at is null and declined_at is null
  ) then
    raise exception 'invitation already pending' using errcode = '23505';
  end if;
  -- Keeps a runaway client from burning the daily email quota.
  if (
    select count(*) from public.invitations
    where wedding_id = p_wedding_id and accepted_at is null and declined_at is null and expires_at > now()
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

-- What the invitation page shows. Public on purpose: the visitor may not be signed in yet, and
-- the 128-bit token is the secret. An unknown token looks the same as an expired one.
create function public.inspect_invitation(p_token text)
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
      when v_inv.expires_at <= now() or v_wedding.deleted_at is not null then 'expired'
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

-- Joins the caller to the wedding with the invited role. The signed-in account must carry the
-- invited email, so a forwarded link does not hand the role to someone else.
create function public.accept_invitation(p_token text)
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
  if v_inv.expires_at <= now()
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

create function public.decline_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invitations set declined_at = now()
  where token_hash = private.invite_token_hash(p_token)
    and accepted_at is null and declined_at is null and expires_at > now();
  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Roster for the members panel: names from profiles, emails from auth.users (not readable by clients).
create function public.list_wedding_members(p_wedding_id uuid)
returns table (id uuid, name text, email text, role public.member_role, is_self boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, coalesce(p.display_name, ''), coalesce(u.email, ''), m.role, m.user_id = (select auth.uid())
  from public.wedding_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.wedding_id = p_wedding_id
    and private.member_role(p_wedding_id) is not null
  order by m.created_at;
$$;

revoke all on function public.create_invitation(uuid, text, public.member_role) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
revoke all on function public.list_wedding_members(uuid) from public, anon;
revoke all on function public.inspect_invitation(text) from public;
revoke all on function public.decline_invitation(text) from public;
revoke all on function private.invite_token_hash(text) from public;
grant execute on function public.create_invitation(uuid, text, public.member_role) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.list_wedding_members(uuid) to authenticated;
grant execute on function public.inspect_invitation(text) to anon, authenticated;
grant execute on function public.decline_invitation(text) to anon, authenticated;
