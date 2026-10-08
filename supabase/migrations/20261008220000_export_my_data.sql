-- NS-061: "Download my data" (GDPR access/portability).
-- Returns one JSON document with every wedding the caller owns and all of its rows.
-- SECURITY INVOKER: RLS still applies on every table, so the caller can only ever
-- read what they could already read. Credentials are left out: invitations are
-- listed by an explicit column allow-list (no token_hash), and the RSVP token
-- table is not read at all. They are secrets, not personal data.

create function public.export_my_data()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_weddings jsonb;
begin
  if v_uid is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    to_jsonb(w) || jsonb_build_object(
      'members', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]') from public.wedding_members m where m.wedding_id = w.id),
      'invitations', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'wedding_id', i.wedding_id, 'email', i.email, 'role', i.role,
        'expires_at', i.expires_at, 'accepted_at', i.accepted_at, 'declined_at', i.declined_at,
        'cancelled_at', i.cancelled_at, 'invited_by', i.invited_by, 'created_at', i.created_at
      ) order by i.created_at), '[]') from public.invitations i where i.wedding_id = w.id),
      'tasks', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]') from public.tasks t where t.wedding_id = w.id),
      'budget_settings', (select to_jsonb(s) from public.budget_settings s where s.wedding_id = w.id),
      'budget_scenarios', (select coalesce(jsonb_agg(to_jsonb(s) order by s.position), '[]') from public.budget_scenarios s where s.wedding_id = w.id),
      'budget_lines', (select coalesce(jsonb_agg(to_jsonb(l) order by l.position), '[]') from public.budget_lines l where l.wedding_id = w.id),
      'households', (select coalesce(jsonb_agg(to_jsonb(h) order by h.position), '[]') from public.households h where h.wedding_id = w.id),
      'guests', (select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at), '[]') from public.guests g where g.wedding_id = w.id),
      'collections', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]') from public.collections c where c.wedding_id = w.id),
      'collection_fields', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at), '[]') from public.collection_fields f where f.wedding_id = w.id),
      'collection_records', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]') from public.collection_records r where r.wedding_id = w.id),
      'activity_log', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]') from public.activity_log a where a.wedding_id = w.id)
    ) order by w.created_at
  ), '[]')
  into v_weddings
  from public.weddings w
  where w.deleted_at is null
    and private.member_role(w.id) = 'owner';

  return jsonb_build_object(
    'exported_at', now(),
    'user_id', v_uid,
    'profile', (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'weddings', v_weddings
  );
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
