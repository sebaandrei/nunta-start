# Ștergerea contului (NS-062)

Din **Setări → Datele și spațiul → Șterge contul**, omul își șterge contul. Funcția `delete-account` rulează cu cheia `service_role`, dar doar pentru utilizatorul din JWT (id-ul vine din `auth.getUser()`, niciodată din cerere) și doar cu `{ "confirm": true }` în corp.

## Ce se întâmplă

1. `delete_account_data(user, email)` (o tranzacție, doar `service_role`):
   - nunțile în care omul e **singurul proprietar** primesc `deleted_at = now()` (dispar pentru toți membrii);
   - nunțile cu alt proprietar rămân, iar omul e scos din ele;
   - invitațiile adresate emailului și intrarea din `allowed_emails` se șterg (pentru a reveni, trebuie reinvitat).
2. `auth.admin.deleteUser`: șterge utilizatorul și, în cascadă, profilul. `updated_by` / `actor_id` / `invited_by` devin `null`.
3. `private.purge_deleted_weddings()` (pg_cron, zilnic la 03:41 UTC) șterge definitiv nunțile cu `deleted_at` mai vechi de 30 de zile; toate tabelele copil se șterg în cascadă. Aceeași curățare prinde și „Șterge spațiul" din Setări.

Pasul 1 e idempotent: dacă pasul 2 eșuează, funcția răspunde 500 „try again" și omul poate încerca din nou.

## Deploy (manual, o dată per proiect cloud)

Pipeline-ul `deploy.yml` aplică doar migrațiile; funcția se publică separat. Nu are secrete proprii (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` le dă platforma).

```bash
npx supabase link --project-ref <ref>
npx supabase functions deploy delete-account
```

`pg_cron` trebuie să fie disponibil pe proiect (Dashboard → Database → Extensions). Fără el, migrația trece, dar curățarea de 30 de zile **nu** rulează; verificare:

```sql
select jobname, schedule from cron.job where jobname = 'purge-deleted-weddings';
```

## Verificare pe staging

1. Cu un cont de test care deține o nuntă singur: Setări → Șterge contul → confirmare. Omul ajunge pe pagina publică.
2. În SQL: nunta are `deleted_at` setat, `wedding_members` nu mai are omul, `auth.users` nu mai are rândul.
3. Curățarea, fără să așteptați 30 de zile: `select private.purge_deleted_weddings(interval '0 seconds');` (doar pe staging), apoi nunta și rândurile ei dispar.

## Ce NU face

- Nu șterge datele din backup-urile criptate (NS-014): rămân până expiră ciclul lor de 30 de zile.
- Nu promovează alt membru la proprietar. Dacă omul vrea ca nunta să continue, mai întâi face proprietar pe partener (Setări → Membri).
