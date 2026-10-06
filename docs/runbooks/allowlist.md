# Allowlist (sign-up pe invitație)

Doar adresele din `public.allowed_emails` își pot crea cont. Tabelul are RLS activ și nicio
policy: se administrează doar din SQL editor (Supabase Dashboard) sau cu service role, niciodată din aplicație.
Conturile existente nu sunt afectate (verificarea rulează doar la creare).

## Adaugă un prieten

```sql
insert into public.allowed_emails (email, note)
values ('prieten@exemplu.ro', 'Ana, prietena lui X')
on conflict do nothing;
```

Emailul se compară fără diferență între litere mari și mici.

## Scoate un email

```sql
delete from public.allowed_emails where email = 'prieten@exemplu.ro';
```

Asta nu șterge un cont deja creat; pentru asta ștergi utilizatorul din Authentication.

## Ce vede cel neinvitat

Triggerul `signup_allowlist` pe `auth.users` aruncă excepția `signup_not_allowed`. Supabase Auth o
întoarce clientului ca eroare generică `Database error saving new user` (status 500, cod `unexpected_failure`).
Aplicația mapează acea eroare la mesajul „Acces pe invitație”.

Local, `supabase/seed.sql` permite `dev1@example.test` și `dev2@example.test`.
