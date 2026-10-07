-- NS-080: per-household RSVP token. Only the sha256 hash is stored; the plaintext is returned
-- once, by generate_household_rsvp_token. The table has RLS on and no policies, so no client can
-- read the hashes; the NS-081 Edge Function reads it with the service role:
--   select household_id, wedding_id from public.household_rsvp_tokens
--   where token_hash = sha256(convert_to(<token>, 'UTF8'));

create table public.household_rsvp_tokens (
  household_id uuid primary key references public.households (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

alter table public.household_rsvp_tokens enable row level security;
revoke all on public.household_rsvp_tokens from anon, authenticated;

create function private.rsvp_token_hash(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(coalesce(p_token, ''), 'UTF8'));
$$;

-- Creates or rotates (replaces) the household's token; any earlier link stops working.
create function public.generate_household_rsvp_token(p_household_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wedding uuid;
  v_token text;
begin
  select h.wedding_id into v_wedding from public.households h where h.id = p_household_id;
  if v_wedding is null
    or not private.has_role(v_wedding, array['owner', 'partner', 'planner', 'helper']::public.member_role[]) then
    raise exception 'not allowed to share this household' using errcode = '42501';
  end if;

  v_token := encode(extensions.gen_random_bytes(20), 'hex');
  insert into public.household_rsvp_tokens (household_id, wedding_id, token_hash, created_by)
  values (p_household_id, v_wedding, private.rsvp_token_hash(v_token), auth.uid())
  on conflict (household_id) do update
    set token_hash = excluded.token_hash, created_at = now(), created_by = excluded.created_by;
  return v_token;
end;
$$;

revoke all on function public.generate_household_rsvp_token(uuid) from public, anon;
grant execute on function public.generate_household_rsvp_token(uuid) to authenticated;
