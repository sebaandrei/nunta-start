-- NS-304 review fixes: two RPCs so field deletion and record edits are atomic and race-free.
--
-- delete_collection_field: removes the field and strips its key from every record of the page in one
-- transaction. The record validator would reject that strip while the field is still required (or
-- while the record has another unrelated problem), so it skips validation while the transaction-local
-- setting private.collection_cleanup is on. Only this function sets it, and it only ever removes a key.
--
-- patch_collection_record: merges only the given keys into a record's data (null or "" clears a key),
-- so two people editing different fields of one record no longer overwrite each other. The validator
-- still checks the merged result.
--
-- Field deletion locks the collection row FOR UPDATE and the record validator takes it FOR SHARE, so
-- a record written while a field is being deleted cannot keep that field's key. Every path takes the
-- collection lock before any record row lock, so they cannot deadlock.
--
-- Both are SECURITY INVOKER: RLS and the audit/broadcast triggers apply to the caller as before.

create or replace function private.validate_collection_record()
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
  -- Set only inside delete_collection_field, which strips a deleted field's key from the records.
  if current_setting('private.collection_cleanup', true) = 'on' then
    return new;
  end if;

  -- A record write waits for a field deletion in progress (which holds this row FOR UPDATE), then
  -- validates against the committed fields, so no record can slip in a key of a field being deleted.
  perform 1 from public.collections where id = new.collection_id for share;

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


create function public.delete_collection_field(p_field_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_field public.collection_fields;
begin
  select * into v_field from public.collection_fields where id = p_field_id;
  if not found then
    raise exception 'field not found' using errcode = 'P0002';
  end if;
  if not private.has_role(v_field.wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]) then
    raise exception 'not allowed to edit this page' using errcode = '42501';
  end if;

  -- Serialize with record writes (see the validator), so the strip below sees every committed record.
  perform 1 from public.collections where id = v_field.collection_id for update;

  perform set_config('private.collection_cleanup', 'on', true);
  update public.collection_records
    set data = data - v_field.key
    where collection_id = v_field.collection_id and data ? v_field.key;
  perform set_config('private.collection_cleanup', 'off', true);

  delete from public.collection_fields where id = p_field_id;
end;
$$;

create function public.patch_collection_record(p_record_id uuid, p_patch jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_wedding uuid;
  v_collection uuid;
begin
  if jsonb_typeof(p_patch) is distinct from 'object' then
    raise exception 'patch must be a JSON object' using errcode = 'check_violation';
  end if;
  select wedding_id, collection_id into v_wedding, v_collection
    from public.collection_records where id = p_record_id;
  if not found then
    raise exception 'record not found' using errcode = 'P0002';
  end if;
  if not private.has_role(v_wedding, array['owner', 'partner', 'planner', 'helper']::public.member_role[]) then
    raise exception 'not allowed to edit this page' using errcode = '42501';
  end if;

  -- Same lock order as delete_collection_field (collection first, then the record row), so the two
  -- cannot deadlock when a field is deleted while an affected record is being edited.
  perform 1 from public.collections where id = v_collection for share;

  update public.collection_records r
    set data = coalesce(
      (select jsonb_object_agg(e.key, e.value)
         from jsonb_each(r.data || p_patch) e
         where e.value <> 'null'::jsonb and e.value <> '""'::jsonb),
      '{}'::jsonb)
    where r.id = p_record_id;
end;
$$;

revoke all on function public.delete_collection_field(uuid) from public, anon;
grant execute on function public.delete_collection_field(uuid) to authenticated;
revoke all on function public.patch_collection_record(uuid, jsonb) from public, anon;
grant execute on function public.patch_collection_record(uuid, jsonb) to authenticated;
