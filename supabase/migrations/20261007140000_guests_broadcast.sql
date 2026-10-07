-- NS-071: live collaboration for the guest list. The audit log (NS-056) does not exist yet,
-- so only the realtime broadcast trigger is attached here.

create trigger households_broadcast
  after insert or update or delete on public.households
  for each row execute function private.broadcast_wedding_change();
create trigger guests_broadcast
  after insert or update or delete on public.guests
  for each row execute function private.broadcast_wedding_change();
