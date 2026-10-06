-- Placeholder pentru ca `supabase test db` să ruleze în CI; testele RLS reale vin odată cu migrările (NS-026+).
begin;
select plan(1);
select ok(true, 'pgTAP rulează');
select * from finish();
rollback;
