-- Restoring a soft-deleted wedding counts against the 5-wedding owner cap, so
-- delete + create + restore cannot exceed it. Same lock as create_wedding.
create or replace function private.guard_wedding_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if new.deleted_at is distinct from old.deleted_at and v_uid is not null then
    if not private.has_role(old.id, array['owner']::public.member_role[]) then
      raise exception 'only the owner can delete or restore a wedding'
        using errcode = 'insufficient_privilege';
    end if;
    if old.deleted_at is not null and new.deleted_at is null then
      perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
      if (
        select count(*)
        from public.wedding_members m
        join public.weddings w on w.id = m.wedding_id
        where m.user_id = v_uid and m.role = 'owner' and w.deleted_at is null
      ) >= 5 then
        raise exception 'wedding limit reached: at most 5 weddings per owner' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;
