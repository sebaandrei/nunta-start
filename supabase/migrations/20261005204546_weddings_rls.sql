-- NS-026: RLS policies for weddings and wedding_members (+ co-member profile visibility).
-- Creating a wedding and adding members happens only through the create_wedding RPC
-- and the invite flow (security definer / service role), so there are no insert policies.

-- weddings: any member reads; owner/partner/planner edit; only the owner deletes.
create policy weddings_select_member on public.weddings
  for select to authenticated
  using (private.member_role(id) is not null);

create policy weddings_update_editors on public.weddings
  for update to authenticated
  using (private.has_role(id, array['owner', 'partner', 'planner']::public.member_role[]))
  with check (private.has_role(id, array['owner', 'partner', 'planner']::public.member_role[]));

create policy weddings_delete_owner on public.weddings
  for delete to authenticated
  using (private.has_role(id, array['owner']::public.member_role[]));

-- wedding_members: members see the roster of their own weddings.
create policy members_select_member on public.wedding_members
  for select to authenticated
  using (private.member_role(wedding_id) is not null);

-- owner/partner manage anyone except owners; planner manages helpers and viewers only.
create policy members_update_managers on public.wedding_members
  for update to authenticated
  using (
    (private.member_role(wedding_id) in ('owner', 'partner') and role <> 'owner')
    or (private.member_role(wedding_id) = 'planner' and role in ('helper', 'viewer'))
  )
  with check (
    (private.member_role(wedding_id) in ('owner', 'partner') and role <> 'owner')
    or (private.member_role(wedding_id) = 'planner' and role in ('helper', 'viewer'))
  );

-- Same rule for removal; any non-owner may also remove themselves (leave).
create policy members_delete_managers_or_self on public.wedding_members
  for delete to authenticated
  using (
    (private.member_role(wedding_id) in ('owner', 'partner') and role <> 'owner')
    or (private.member_role(wedding_id) = 'planner' and role in ('helper', 'viewer'))
    or (user_id = (select auth.uid()) and role <> 'owner')
  );

-- Only the role can change on a membership row (not user_id / wedding_id).
revoke update on public.wedding_members from authenticated;
grant update (role) on public.wedding_members to authenticated;

-- Members can see each other's profile (names in the members panel).
create policy profiles_select_co_members on public.profiles
  for select to authenticated
  using (id in (select user_id from public.wedding_members));
