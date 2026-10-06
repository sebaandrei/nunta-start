-- NS-210: wedding city/venue and godparents (nasi). RLS is unchanged: the existing
-- weddings_update_editors policy (owner/partner/planner) already covers the new columns.
-- create_wedding is replaced to accept optional input keys `city` and `godparents`.

-- CHECK constraints cannot contain subqueries, hence the helper.
create function private.is_valid_godparents(g jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(g) <> 'array' or jsonb_array_length(g) > 5 then false
    else not exists (
      select 1 from jsonb_array_elements(g) e
      where jsonb_typeof(e) <> 'object'
         or jsonb_typeof(e -> 'godmother') is distinct from 'string'
         or jsonb_typeof(e -> 'godfather') is distinct from 'string'
         or char_length(e ->> 'godmother') > 120
         or char_length(e ->> 'godfather') > 120
    )
  end
$$;

alter table public.weddings
  add column city text check (char_length(city) <= 120),
  add column godparents jsonb not null default '[]'::jsonb
    check (private.is_valid_godparents(godparents));

create or replace function public.create_wedding(input jsonb, tasks_template jsonb, budget_template jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_scenarios jsonb;
  v_selected uuid;
  v_name text;
  v_p1 text;
  v_p2 text;
  v_date date;
  v_rate numeric;
  v_city text;
  v_godparents jsonb;
  v_cur public.currency;
  v_gift numeric;
  v_gift_cur public.currency;
  v_family numeric;
  v_family_cur public.currency;
  v_pos int;
  rec record;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if input is null or jsonb_typeof(input) <> 'object' then
    raise exception 'input must be a json object' using errcode = '22023';
  end if;
  if tasks_template is null or jsonb_typeof(tasks_template) <> 'array'
     or jsonb_array_length(tasks_template) > 200 then
    raise exception 'tasks_template must be an array of at most 200 items' using errcode = '22023';
  end if;
  if budget_template is null or jsonb_typeof(budget_template) <> 'array'
     or jsonb_array_length(budget_template) > 200 then
    raise exception 'budget_template must be an array of at most 200 items' using errcode = '22023';
  end if;

  -- Text fields must be strings when present.
  if jsonb_typeof(input -> 'name') is distinct from 'string'
     or jsonb_typeof(input -> 'partner1_name') is distinct from 'string'
     or jsonb_typeof(input -> 'partner2_name') is distinct from 'string' then
    raise exception 'name, partner1_name and partner2_name are required strings' using errcode = '22023';
  end if;
  v_name := btrim(input ->> 'name');
  v_p1 := btrim(input ->> 'partner1_name');
  v_p2 := btrim(input ->> 'partner2_name');
  if v_name = '' or v_p1 = '' or v_p2 = '' then
    raise exception 'name, partner1_name and partner2_name must not be empty' using errcode = '22023';
  end if;
  if char_length(v_name) > 120 or char_length(v_p1) > 80 or char_length(v_p2) > 80 then
    raise exception 'name or partner names too long' using errcode = '22023';
  end if;

  begin
    if input ? 'wedding_date' and jsonb_typeof(input -> 'wedding_date') <> 'null' then
      if jsonb_typeof(input -> 'wedding_date') <> 'string' then
        raise exception 'bad date';
      end if;
      v_date := (input ->> 'wedding_date')::date;
    end if;
    v_rate := coalesce(
      case when jsonb_typeof(input -> 'eur_rate') = 'number' then (input ->> 'eur_rate')::numeric end, 5);
    if input ? 'eur_rate' and jsonb_typeof(input -> 'eur_rate') not in ('number', 'null') then
      raise exception 'bad rate';
    end if;
    v_cur := coalesce(nullif(input ->> 'display_currency', ''), 'RON')::public.currency;
    v_gift_cur := coalesce(nullif(input ->> 'gift_per_guest_currency', ''), 'RON')::public.currency;
    v_family_cur := coalesce(nullif(input ->> 'family_gift_currency', ''), 'RON')::public.currency;
    v_gift := (input ->> 'gift_per_guest')::numeric;
    v_family := (input ->> 'family_gift')::numeric;
  exception when others then
    raise exception 'invalid wedding_date, eur_rate, currency or gift value' using errcode = '22023';
  end;
  if v_rate <= 0 or v_rate >= 1000000 or v_gift < 0 or v_family < 0
     or v_gift >= 1e10 or v_family >= 1e10 then
    raise exception 'eur_rate must be positive and gifts non-negative' using errcode = '22023';
  end if;

  if jsonb_typeof(input -> 'city') not in ('string', 'null') and input ? 'city' then
    raise exception 'city must be a string' using errcode = '22023';
  end if;
  v_city := nullif(btrim(coalesce(input ->> 'city', '')), '');
  v_godparents := coalesce(nullif(input -> 'godparents', 'null'::jsonb), '[]'::jsonb);
  -- length and shape of city and godparents are enforced by the table constraints (check_violation)

  v_scenarios := coalesce(nullif(input -> 'guest_scenarios', 'null'::jsonb), '[200]'::jsonb);
  if jsonb_typeof(v_scenarios) <> 'array' or jsonb_array_length(v_scenarios) not between 1 and 4
     or exists (
       select 1 from jsonb_array_elements(v_scenarios) e
       where jsonb_typeof(e) <> 'number' or (e #>> '{}') !~ '^[0-9]{1,6}$' or (e #>> '{}')::int < 1
     ) then
    raise exception 'guest_scenarios must be 1-4 positive integers' using errcode = '22023';
  end if;

  -- Template items: objects with bounded strings.
  if exists (
    select 1 from jsonb_array_elements(tasks_template) t
    where jsonb_typeof(t) <> 'object'
       or jsonb_typeof(t -> 'title') is distinct from 'string'
       or btrim(t ->> 'title') = ''
       or char_length(t ->> 'title') > 300
       or jsonb_typeof(t -> 'category') is distinct from 'string'
       or char_length(t ->> 'category') > 30
       or char_length(coalesce(t ->> 'template_key', '')) > 100
       or char_length(coalesce(t ->> 'details', '')) > 2000
       or jsonb_typeof(t -> 'template_key') not in ('string', 'null') and t ? 'template_key'
       or jsonb_typeof(t -> 'details') not in ('string', 'null') and t ? 'details'
       or jsonb_typeof(t -> 'days_before') not in ('number', 'null') and t ? 'days_before'
       or (jsonb_typeof(t -> 'days_before') = 'number' and (t ->> 'days_before') !~ '^[0-9]{1,5}$')
  ) then
    raise exception 'invalid tasks_template item' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(budget_template) b
    where jsonb_typeof(b) <> 'object'
       or jsonb_typeof(b -> 'name') is distinct from 'string'
       or btrim(b ->> 'name') = ''
       or char_length(b ->> 'name') > 120
       or jsonb_typeof(b -> 'currency') is distinct from 'string'
       or b ->> 'currency' not in ('EUR', 'RON')
       or jsonb_typeof(b -> 'per_guest') is distinct from 'boolean'
  ) then
    raise exception 'invalid budget_template item' using errcode = '22023';
  end if;

  -- Cap: at most 5 non-deleted weddings owned per user. The advisory lock serializes
  -- concurrent calls of the same user so the cap cannot be raced.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if (
    select count(*)
    from public.wedding_members m
    join public.weddings w on w.id = m.wedding_id
    where m.user_id = v_uid and m.role = 'owner' and w.deleted_at is null
  ) >= 5 then
    raise exception 'wedding limit reached: at most 5 weddings per owner' using errcode = 'P0001';
  end if;

  insert into public.weddings (name, wedding_date, partner1_name, partner2_name, eur_rate, display_currency, city, godparents)
  values (v_name, v_date, v_p1, v_p2, v_rate, v_cur, v_city, v_godparents)
  returning id into v_id;

  insert into public.wedding_members (wedding_id, user_id, role) values (v_id, v_uid, 'owner');

  insert into public.tasks (wedding_id, template_key, title, category, days_before, details, position)
  select v_id, t ->> 'template_key', btrim(t ->> 'title'), t ->> 'category',
         (t ->> 'days_before')::int, coalesce(t ->> 'details', ''), (n - 1) * 10
  from jsonb_array_elements(tasks_template) with ordinality as x(t, n);

  v_pos := 0;
  for rec in select e::int as guests from jsonb_array_elements_text(v_scenarios) e loop
    insert into public.budget_scenarios (wedding_id, guests, position)
    values (v_id, rec.guests, v_pos * 10)
    returning id into v_selected;
    if v_pos = 0 then
      -- first scenario is the selected one
      insert into public.budget_settings
        (wedding_id, gift_per_guest, gift_per_guest_currency, family_gift, family_gift_currency, selected_scenario_id)
      values (v_id, v_gift, v_gift_cur, v_family, v_family_cur, v_selected);
    end if;
    v_pos := v_pos + 1;
  end loop;

  insert into public.budget_lines (wedding_id, name, currency, qty_kind, qty_count, position)
  select v_id, btrim(b ->> 'name'), (b ->> 'currency')::public.currency,
         case when (b ->> 'per_guest')::boolean then 'per_guest' else 'fixed' end,
         case when (b ->> 'per_guest')::boolean then null else 1 end,
         (n - 1) * 10
  from jsonb_array_elements(budget_template) with ordinality as x(b, n);

  return v_id;
end;
$$;

