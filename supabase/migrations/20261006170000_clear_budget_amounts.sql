-- NS-043: "clear amounts" in one transaction, so a failure cannot leave line prices and payments
-- cleared while the gifts stay. SECURITY INVOKER: the budget_lines / budget_settings RLS policies
-- (editors only) apply to the caller.
create or replace function public.clear_budget_amounts(p_wedding_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.budget_lines set unit_price = null, paid = null where wedding_id = p_wedding_id;

  insert into public.budget_settings (wedding_id, gift_per_guest, family_gift)
  values (p_wedding_id, null, null)
  on conflict (wedding_id) do update set gift_per_guest = null, family_gift = null;
end;
$$;

revoke execute on function public.clear_budget_amounts(uuid) from public, anon;
grant execute on function public.clear_budget_amounts(uuid) to authenticated;
