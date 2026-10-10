-- NS-120: day-of timeline + per-wedding share token.
-- Read: any member. Write: owner, partner, planner, helper (not viewer).
--
-- start_time is `time` (wall clock, no zone): the wedding day is a single day (its date lives on
-- weddings) and the schedule is read on site, so a timestamptz would only add timezone/DST traps.
-- Events after midnight are ordered by `position`, not by start_time.
--
-- Share token (same design as NS-080 RSVP tokens): one row per wedding in timeline_share_tokens,
-- only the sha256 is stored, the plaintext is returned once by generate_timeline_share_token and
-- generating again replaces the hash, so the old link stops working. The table has RLS on and no
-- policies and no client grants, so no client (viewer included) can read the hash. The future public
-- page / Edge Function uses the service role (as the RSVP one does), there is no anon-callable lookup:
--   select e.* from public.timeline_share_tokens t
--   join public.timeline_events e on e.wedding_id = t.wedding_id
--   where t.token_hash = private.rsvp_token_hash(<token>) order by e.position;

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  title text not null,
  start_time time not null,
  duration_minutes integer check (duration_minutes > 0),
  location text not null default '',
  notes text not null default '',
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index timeline_events_wedding_idx on public.timeline_events (wedding_id);

create trigger timeline_events_set_audit
  before update on public.timeline_events
  for each row execute function private.set_audit_columns();
create trigger timeline_events_immutable_wedding
  before update on public.timeline_events
  for each row execute function private.forbid_column_change('wedding_id');
create trigger timeline_events_broadcast
  after insert or update or delete on public.timeline_events
  for each row execute function private.broadcast_wedding_change();
create trigger timeline_events_activity
  after insert or update or delete on public.timeline_events
  for each row execute function private.write_activity_log();

alter table public.timeline_events enable row level security;

create policy timeline_events_select_member on public.timeline_events
  for select to authenticated
  using (private.member_role(wedding_id) is not null);
create policy timeline_events_insert_editors on public.timeline_events
  for insert to authenticated
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy timeline_events_update_editors on public.timeline_events
  for update to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]))
  with check (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));
create policy timeline_events_delete_editors on public.timeline_events
  for delete to authenticated
  using (private.has_role(wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]));

create table public.timeline_share_tokens (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

alter table public.timeline_share_tokens enable row level security;
revoke all on public.timeline_share_tokens from anon, authenticated;

-- Creates or rotates (replaces) the wedding's share token; any earlier link stops working.
create function public.generate_timeline_share_token(p_wedding_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not private.has_role(p_wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]) then
    raise exception 'not allowed to share this timeline' using errcode = '42501';
  end if;

  v_token := encode(extensions.gen_random_bytes(20), 'hex');
  insert into public.timeline_share_tokens (wedding_id, token_hash, created_by)
  values (p_wedding_id, private.rsvp_token_hash(v_token), auth.uid())
  on conflict (wedding_id) do update
    set token_hash = excluded.token_hash, created_at = now(), created_by = excluded.created_by;
  return v_token;
end;
$$;

revoke all on function public.generate_timeline_share_token(uuid) from public, anon;
grant execute on function public.generate_timeline_share_token(uuid) to authenticated;
